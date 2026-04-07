from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncGenerator, List, Tuple
from uuid import UUID

logger = logging.getLogger(__name__)

import chromadb
from chromadb.utils import embedding_functions
from groq import Groq
from sse_starlette.sse import EventSourceResponse

from .config import PlanName, get_plan_limits, get_settings


settings = get_settings()

chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_directory)

# Lazy embedding function — loaded on first use so startup is never blocked
# by a network request to HuggingFace.
_embedding_fn = None

def _get_embedding_fn():
    global _embedding_fn
    if _embedding_fn is not None:
        return _embedding_fn
    try:
        _embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        logger.info("SentenceTransformer embedding loaded successfully.")
    except Exception as exc:
        logger.warning(
            "Could not load SentenceTransformer model (%s). "
            "Falling back to ChromaDB default embedding.", exc
        )
        _embedding_fn = embedding_functions.DefaultEmbeddingFunction()
    return _embedding_fn

groq_client = Groq(api_key=settings.groq_api_key)


def _collection_name(org_id: UUID) -> str:
    return f"org_{org_id}"


def get_org_collection(org_id: UUID):
    return chroma_client.get_or_create_collection(
        name=_collection_name(org_id),
        embedding_function=_get_embedding_fn(),
    )


def chunk_text(text: str, size: int = 800, overlap: int = 150) -> List[str]:
    chunks: List[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(length, start + size)
        chunks.append(text[start:end])
        if end == length:
            break
        start = end - overlap
    return chunks


def index_document(
    org_id: UUID,
    document_id: UUID,
    content: str,
    metadata: dict[str, Any],
) -> int:
    """
    Synchronous indexing for use in a background task: chunk, embed, and store in Chroma.
    Returns number of chunks stored.
    """
    collection = get_org_collection(org_id)
    chunks = chunk_text(content)
    ids = [f"{document_id}_{i}" for i in range(len(chunks))]
    metas = [{**metadata, "chunk_index": i} for i in range(len(chunks))]
    collection.add(ids=ids, documents=chunks, metadatas=metas)
    return len(chunks)


def query_context(
    org_id: UUID,
    query: str,
    top_k: int = 5,
) -> Tuple[str, list[dict[str, Any]]]:
    """Query ChromaDB for relevant context. Returns formatted context with citation indices."""
    collection = get_org_collection(org_id)
    try:
        result = collection.query(query_texts=[query], n_results=top_k)
    except Exception as exc:
        logger.debug("ChromaDB query returned no results: %s", exc)
        return "", []
        
    docs = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    
    context_parts: List[str] = []
    sources: list[dict[str, Any]] = []
    
    for i, (doc, meta) in enumerate(zip(docs, metadatas), start=1):
        filename = meta.get("filename", "Unknown")
        context_parts.append(f"[Source {i}] {filename}:\n{doc}")
        sources.append({
            "idx": i,
            "filename": filename,
            "chunk_index": meta.get("chunk_index"),
        })
        
    context = "\n\n".join(context_parts)
    return context, sources


def build_prompt(question: str, context: str) -> str:
    system = (
        "You are an AI data analyst for a SaaS platform. "
        "Answer the user's question using ONLY the provided context. "
        "If you use information from the context, you MUST cite the source using its index directly in the text, e.g. [Source 1]. "
        "Format your answer as a clear, professional analytical report using standard Markdown. "
        "Follow these strictly:\n"
        "- Structure the output using clear sections with bold headings (e.g., **Introduction**, **Key Columns**).\n"
        "- Use bullet points (-) for readability when listing items or metrics.\n"
        "- Ensure consistent use of line breaks between sections to avoid walls of text.\n"
        "- Avoid dumping raw data; summarize insights concisely and professionally.\n"
        "- Format numerical values clearly with commas.\n"
        "If the context does not contain the answer, say you are not sure."
    )
    prompt = f"{system}\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    return prompt


async def stream_chat_completion(
    org_plan: PlanName,
    prompt: str,
    ai_provider: str = "groq",
    ai_model: str | None = None,
    ai_api_key: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat completion supporting multi-model and BYOK via HTTPx."""
    plan_config = get_plan_limits(org_plan)
    
    # Use org specific model if defined, otherwise grab from plan/defaults
    model = (ai_model and ai_model.strip()) or plan_config.get("model", "llama3-8b-8192")
    
    if ai_provider == "openai":
        import httpx
        import json
        api_key = (ai_api_key and ai_api_key.strip())
        if not api_key:
            yield "Configure an OpenAI API key in Organization Settings to use OpenAI."
            return
            
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", 
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "stream": True}
            ) as response:
                if response.status_code != 200:
                    yield f"OpenAI Error: {response.status_code} - Check your API key or model name."
                    return
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            data = json.loads(line[6:])
                            delta = data["choices"][0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            pass
                            
    elif ai_provider == "anthropic":
        import httpx
        import json
        api_key = (ai_api_key and ai_api_key.strip())
        if not api_key:
            yield "Configure an Anthropic API key in Organization Settings to use Anthropic."
            return
            
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST", 
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
                json={"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1024, "stream": True}
            ) as response:
                if response.status_code != 200:
                    yield f"Anthropic Error: {response.status_code} - Check your API key or model name."
                    return
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            if data.get("type") == "content_block_delta":
                                delta = data.get("delta", {}).get("text", "")
                                if delta:
                                    yield delta
                        except Exception:
                            pass
                            
    else:
        # Default Groq provider
        api_key = (ai_api_key and ai_api_key.strip()) or settings.groq_api_key
        client = Groq(api_key=api_key)
        stream = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            stream=True,
            messages=[{"role": "user", "content": prompt}],
        )
        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content


async def sse_chat_response(generator: AsyncGenerator[str, None]) -> EventSourceResponse:
    async def event_publisher() -> AsyncGenerator[dict[str, str], None]:
        async for token in generator:
            yield {"data": token}
        yield {"event": "end", "data": "[DONE]"}

    return EventSourceResponse(event_publisher())

