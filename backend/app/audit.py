from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from .models import AuditLog


def log_audit_event(
    db: Session,
    org_id: UUID,
    user_id: Optional[UUID],
    action: str,
    details: Optional[dict[str, Any]] = None,
) -> None:
    entry = AuditLog(org_id=org_id, user_id=user_id, action=action, details=details or {})
    db.add(entry)
    db.commit()

