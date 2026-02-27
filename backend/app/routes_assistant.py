from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session

from . import schemas
from .ai import build_prompt, query_context, sse_chat_response, stream_chat_completion
from .audit import log_audit_event
from .config import PlanName, get_plan_limits
from .db import get_db
from .dependencies import get_current_org, get_current_user, get_usage_for_org
from .models import Conversation, Message, Organization, Usage, User
from .redis_client import rate_limit


router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/conversations", response_model=schemas.ConversationListResponse)
def list_conversations(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    plan: PlanName = org.plan  # type: ignore[assignment]
    limits = get_plan_limits(plan)
    if not limits["conversation_history"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conversation history is not available on your current plan.",
        )
    convs = (
        db.query(Conversation)
        .filter(Conversation.org_id == org.id)
        .order_by(Conversation.updated_at.desc())
        .limit(50)
        .all()
    )
    return schemas.ConversationListResponse(conversations=convs)


@router.post("/chat", response_class=EventSourceResponse, responses={429: {"model": schemas.ErrorResponse}})
async def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    # Rate limit per user via Redis
    allowed = await rate_limit(f"chat:{user.id}", limit=10, window_seconds=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please slow down.",
        )

    # Plan limits for AI queries with proper logging when hard limit hit
    usage = get_usage_for_org(db, org.id)
    plan: PlanName = org.plan  # type: ignore[assignment]
    limits = get_plan_limits(plan)
    max_q = limits["max_ai_queries"]
    if max_q is not None and usage.ai_queries_used >= max_q:
        log_audit_event(
            db,
            org.id,
            user.id,
            "limit_hit",
            {"kind": "ai_queries", "plan": plan, "used": usage.ai_queries_used, "limit": max_q},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI query limit exceeded for current plan. Upgrade to continue.",
        )

    # Fetch per-tenant context from Chroma
    context, sources = query_context(org.id, payload.message)
    prompt = build_prompt(payload.message, context)

    # Conversation history persistence (Pro+)
    conv_id: Optional[UUID] = payload.conversation_id
    if limits["conversation_history"]:
        if conv_id:
            conv = db.query(Conversation).filter(Conversation.id == conv_id, Conversation.org_id == org.id).first()
        else:
            conv = Conversation(
                org_id=org.id,
                user_id=user.id,
                title=payload.message[:80] or "Conversation",
            )
            db.add(conv)
            db.flush()
            conv_id = conv.id
        user_msg = Message(conversation_id=conv_id, role="user", content=payload.message)
        db.add(user_msg)

    usage.ai_queries_used += 1
    db.commit()

    log_audit_event(
        db,
        org.id,
        user.id,
        "ai_query",
        {"conversation_id": str(conv_id) if conv_id else None},
    )

    async def token_stream():
        answer_parts: list[str] = []
        async for token in stream_chat_completion(org_plan=plan, prompt=prompt):
            answer_parts.append(token)
            yield token

        # Persist assistant message with sources at the end if plan allows history
        if limits["conversation_history"] and conv_id:
            full_answer = "".join(answer_parts)
            conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
            if conv:
                conv.updated_at = datetime.utcnow()
            msg = Message(
                conversation_id=conv_id,
                role="assistant",
                content=full_answer,
                sources=sources,
            )
            db.add(msg)
            db.commit()

    return await sse_chat_response(token_stream())

