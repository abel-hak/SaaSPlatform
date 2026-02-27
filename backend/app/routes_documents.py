import os
from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from . import schemas
from .ai import index_document
from .audit import log_audit_event
from .config import get_settings
from .db import get_db
from .dependencies import enforce_plan_limits, get_current_org, get_current_user, get_usage_for_org
from .models import Document, Organization, Usage, User


router = APIRouter(prefix="/documents", tags=["documents"])

settings = get_settings()
STORAGE_ROOT = Path("storage") / "documents"


def _document_path(org_id: UUID, document_id: UUID, filename: str) -> Path:
    return STORAGE_ROOT / str(org_id) / str(document_id) / filename


@router.get("/", response_model=schemas.DocumentListResponse)
def list_documents(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    docs = (
        db.query(Document)
        .filter(Document.org_id == org.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return schemas.DocumentListResponse(documents=docs)


@router.post(
    "/upload",
    status_code=202,
    response_model=schemas.DocumentStatusResponse,
    responses={429: {"model": schemas.ErrorResponse}},
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    usage = get_usage_for_org(db, org.id)
    enforce_plan_limits(org, usage, kind="documents")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    doc = Document(
        org_id=org.id,
        uploaded_by=user.id,
        filename=file.filename,
        size_bytes=len(contents),
        status="processing",
    )
    db.add(doc)

    usage.documents_uploaded += 1
    db.commit()
    db.refresh(doc)

    # Persist file to disk
    path = _document_path(org.id, doc.id, file.filename)
    os.makedirs(path.parent, exist_ok=True)
    with open(path, "wb") as f:
        f.write(contents)

    log_audit_event(
        db,
        org.id,
        user.id,
        "document_uploaded",
        {"document_id": str(doc.id), "filename": file.filename},
    )

    # Background indexing
    def process_document():
        from sqlalchemy.orm import Session as SyncSession
        from .db import SessionLocal

        db_session: SyncSession = SessionLocal()
        try:
            doc_db = db_session.query(Document).filter(Document.id == doc.id).first()
            if not doc_db:
                return
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
                chunk_count = index_document(
                    org_id=org.id,
                    document_id=doc.id,
                    content=text,
                    metadata={"filename": file.filename},
                )
                doc_db.chunk_count = chunk_count
                doc_db.status = "ready"
            except Exception:
                doc_db.status = "failed"
            db_session.commit()
        finally:
            db_session.close()

    background_tasks.add_task(process_document)

    return schemas.DocumentStatusResponse(id=doc.id, status=doc.status)


@router.get("/{document_id}/status", response_model=schemas.DocumentStatusResponse)
def get_document_status(
    document_id: UUID,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id, Document.org_id == org.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return schemas.DocumentStatusResponse(id=doc.id, status=doc.status)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id, Document.org_id == org.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    db.delete(doc)
    db.commit()

    # Delete files on disk
    dir_path = STORAGE_ROOT / str(org.id) / str(document_id)
    if dir_path.exists():
        for child in dir_path.iterdir():
            child.unlink()
        dir_path.rmdir()

    log_audit_event(
        db,
        org.id,
        user.id,
        "document_deleted",
        {"document_id": str(document_id)},
    )

