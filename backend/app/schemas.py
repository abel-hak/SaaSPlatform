from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from .config import PlanName


class ErrorResponse(BaseModel):
    detail: str
    code: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    id: UUID
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


class OrganizationBase(BaseModel):
    id: UUID
    name: str
    slug: str
    plan: PlanName

    class Config:
        from_attributes = True


class MeResponse(BaseModel):
    user: UserBase
    organization: OrganizationBase


class RegisterRequest(BaseModel):
    org_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class InviteCreateRequest(BaseModel):
    email: EmailStr
    role: Literal["admin", "member"]


class InviteAcceptRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=8)


class Member(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class MemberListResponse(BaseModel):
    members: list[Member]
    seats_used: int
    seats_limit: Optional[int]


class MemberRoleUpdateRequest(BaseModel):
    role: Literal["owner", "admin", "member"]


class UsageMetrics(BaseModel):
    period: str
    ai_queries_used: int
    ai_queries_limit: Optional[int]
    documents_uploaded: int
    documents_limit: Optional[int]
    seats_used: int
    seats_limit: Optional[int]
    warnings: list[str]


class UsageResponse(BaseModel):
    usage: UsageMetrics


class DocumentItem(BaseModel):
    id: UUID
    filename: str
    size_bytes: int
    status: str
    chunk_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: list[DocumentItem]


class DocumentStatusResponse(BaseModel):
    id: UUID
    status: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None


class ConversationItem(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    conversations: list[ConversationItem]


class AuditLogItem(BaseModel):
    id: int
    org_id: UUID
    user_id: Optional[UUID]
    action: str
    details: Optional[dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: list[AuditLogItem]
    total: int


class BillingPortalResponse(BaseModel):
    url: str


class CheckoutSessionRequest(BaseModel):
    plan: PlanName


class CheckoutSessionResponse(BaseModel):
    url: str

