import threading

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from db.database import SessionLocal, get_db
from models.schemas import DocumentDetail, DocumentResponse
from services.graph_builder import process_document
from services.storage import create_document, get_document, list_documents

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])


def _run_pipeline(document_id: str):
    db = SessionLocal()
    try:
        document = get_document(db, document_id)
        if document:
            try:
                process_document(db, document)
            except Exception:
                document.status = "failed"
                db.commit()
    finally:
        db.close()


def _start_pipeline(document_id: str):
    """Run NLP in a background thread so uploads stay responsive on a single worker."""
    threading.Thread(target=_run_pipeline, args=(document_id,), daemon=True).start()


@router.post("/upload", response_model=DocumentResponse)
async def upload_single(
    title: str = Form(...),
    source: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = await file.read()
    raw_text = content.decode("utf-8", errors="replace")
    doc = create_document(db, title=title, raw_text=raw_text, source=source or file.filename)
    _start_pipeline(doc.id)
    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        source=doc.source,
        upload_timestamp=doc.upload_timestamp,
        status=doc.status,
    )


@router.post("/upload/text", response_model=DocumentResponse)
async def upload_text(
    title: str = Form(...),
    raw_text: str = Form(...),
    source: str = Form(None),
    db: Session = Depends(get_db),
):
    doc = create_document(db, title=title, raw_text=raw_text, source=source)
    _start_pipeline(doc.id)
    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        source=doc.source,
        upload_timestamp=doc.upload_timestamp,
        status=doc.status,
    )


@router.post("/upload/batch", response_model=list[DocumentResponse])
async def upload_batch(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    results = []
    for file in files:
        content = await file.read()
        raw_text = content.decode("utf-8", errors="replace")
        title = file.filename or "Untitled Document"
        doc = create_document(db, title=title, raw_text=raw_text, source=file.filename)
        _start_pipeline(doc.id)
        results.append(DocumentResponse(
            id=doc.id,
            title=doc.title,
            source=doc.source,
            upload_timestamp=doc.upload_timestamp,
            status=doc.status,
        ))
    return results
