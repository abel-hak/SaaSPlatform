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
    """Query ChromaDB for relevant context. Returns empty result if collection has no documents."""
    collection = get_org_collection(org_id)
    try:
        # ChromaDB raises an exception if the collection is empty
        result = collection.query(query_texts=[query], n_results=top_k)
    except Exception as exc:
        logger.debug("ChromaDB query returned no results (collection may be empty): %s", exc)
        return "", []
    docs = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    context_parts: List[str] = []
    sources: list[dict[str, Any]] = []
    for doc, meta in zip(docs, metadatas):
        context_parts.append(doc)
        sources.append(
            {
                "filename": meta.get("filename"),
                "chunk_index": meta.get("chunk_index"),
            }
        )
    context = "\n\n".join(context_parts)
    return context, sources


def build_prompt(question: str, context: str) -> str:
    system = (
        "You are an AI assistant for a SaaS platform. "
        "Answer the user's question using ONLY the provided context. "
        "If the context does not contain the answer, say you are not sure."
    )
    prompt = f"{system}\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer:"
    return prompt


async def stream_chat_completion(
    org_plan: PlanName,
    prompt: str,
) -> AsyncGenerator[str, None]:
    """Stream chat completion from Groq without blocking the event loop."""
    plan_config = get_plan_limits(org_plan)
    model = plan_config["model"]
    # Run the blocking Groq SDK call in a thread pool so the event loop stays free
    stream = await asyncio.to_thread(
        groq_client.chat.completions.create,
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

