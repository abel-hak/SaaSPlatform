import logging
import os
from pathlib import Path
from typing import List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from . import schemas
from .ai import get_org_collection, index_document
from .audit import log_audit_event
from .config import get_settings
from .db import get_db
from .dependencies import enforce_plan_limits, get_current_org, get_current_user, get_usage_for_org
from .models import Document, Organization, Usage, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

settings = get_settings()
STORAGE_ROOT = Path("storage") / "documents"

# Bug 5: whitelist of allowed text-based extensions the indexer can process
ALLOWED_EXTENSIONS = {
    ".txt", ".md", ".rst", ".csv", ".json", ".xml",
    ".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css",
    ".yaml", ".yml", ".toml", ".ini", ".cfg", ".log",
    ".pdf",  # PDF text extraction via built-in byte parsing
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _extract_text(path: Path) -> str:
    """Extract readable text from a file.
    Handles PDFs via raw byte scanning (no extra deps) and text files via UTF-8.
    """
    if path.suffix.lower() == ".pdf":
        import re
        try:
            raw = path.read_bytes()
            parts: list[str] = []
            for block in re.findall(rb'BT.*?ET', raw, re.DOTALL):
                for lit in re.findall(rb'\(([^)]*)\)\s*Tj', block):
                    parts.append(lit.decode('latin-1', errors='ignore'))
                for arr in re.findall(rb'\[([^\]]*)\]\s*TJ', block):
                    for lit in re.findall(rb'\(([^)]*)\)', arr):
                        parts.append(lit.decode('latin-1', errors='ignore'))
            text = ' '.join(parts).strip()
            if not text:
                # Fallback: grab printable ASCII sequences
                text = re.sub(rb'[^\x20-\x7E\n]', b' ', raw).decode('ascii', errors='ignore')
            return text
        except Exception as exc:
            logger.warning("PDF extraction fallback for %s: %s", path.name, exc)
            return path.read_bytes().decode('latin-1', errors='ignore')
    return path.read_text(encoding='utf-8', errors='ignore')


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

    # Bug 5: enforce file size limit
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
        )

    # Bug 5: enforce file type whitelist
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File type '{ext}' is not supported. "
                f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

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

    # Capture plain scalar values now — ORM objects cannot be used after
    # the request session closes (DetachedInstanceError fix)
    _org_id: UUID = org.id
    _doc_id: UUID = doc.id
    _filename: str = file.filename or ""
    _path: Path = path

    # Background indexing
    def process_document():
        from sqlalchemy.orm import Session as SyncSession
        from .db import SessionLocal

        db_session: SyncSession = SessionLocal()
        try:
            doc_db = db_session.query(Document).filter(Document.id == _doc_id).first()
            if not doc_db:
                return
            try:
                text = _extract_text(_path)
                chunk_count = index_document(
                    org_id=_org_id,
                    document_id=_doc_id,
                    content=text,
                    metadata={"filename": _filename},
                )
                doc_db.chunk_count = chunk_count
                doc_db.status = "ready"
                logger.info("Indexed document %s (%d chunks)", _doc_id, chunk_count)
            except Exception as exc:
                logger.error("Failed to index document %s: %s", _doc_id, exc, exc_info=True)
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


@router.get("/{document_id}/chunks", response_model=schemas.DocumentChunksResponse)
def get_document_chunks(
    document_id: UUID,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id, Document.org_id == org.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if doc.status != "ready":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document is not yet indexed")

    collection = get_org_collection(org.id)
    all_data = collection.get(
        ids=[f"{document_id}_{i}" for i in range(doc.chunk_count)],
        include=["documents", "metadatas"],
    )
    chunks = []
    for i, (text, meta) in enumerate(zip(all_data.get("documents", []), all_data.get("metadatas", []))):
        chunks.append(schemas.DocumentChunk(
            chunk_index=meta.get("chunk_index", i) if meta else i,
            content=text or "",
            filename=meta.get("filename", doc.filename) if meta else doc.filename,
        ))
    chunks.sort(key=lambda c: c.chunk_index)
    return schemas.DocumentChunksResponse(document_id=doc.id, filename=doc.filename, chunks=chunks)


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

    # Bug 6 fix: remove vector embeddings from ChromaDB so deleted docs
    # are no longer retrieved as AI context
    try:
        collection = get_org_collection(org.id)
        all_chunk_ids = collection.get()["ids"]
        doc_chunk_ids = [cid for cid in all_chunk_ids if cid.startswith(str(document_id))]
        if doc_chunk_ids:
            collection.delete(ids=doc_chunk_ids)
            logger.info("Removed %d ChromaDB chunks for document %s", len(doc_chunk_ids), document_id)
    except Exception as exc:
        logger.warning("Could not remove ChromaDB chunks for document %s: %s", document_id, exc)

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

