from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
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


@router.post("/upload", response_model=DocumentResponse)
async def upload_single(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    source: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    content = await file.read()
    raw_text = content.decode("utf-8", errors="replace")
    doc = create_document(db, title=title, raw_text=raw_text, source=source or file.filename)
    background_tasks.add_task(_run_pipeline, doc.id)
    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        source=doc.source,
        upload_timestamp=doc.upload_timestamp,
        status=doc.status,
    )


@router.post("/upload/text", response_model=DocumentResponse)
async def upload_text(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    raw_text: str = Form(...),
    source: str = Form(None),
    db: Session = Depends(get_db),
):
    doc = create_document(db, title=title, raw_text=raw_text, source=source)
    background_tasks.add_task(_run_pipeline, doc.id)
    return DocumentResponse(
        id=doc.id,
        title=doc.title,
        source=doc.source,
        upload_timestamp=doc.upload_timestamp,
        status=doc.status,
    )


@router.post("/upload/batch", response_model=list[DocumentResponse])
async def upload_batch(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    results = []
    for file in files:
        content = await file.read()
        raw_text = content.decode("utf-8", errors="replace")
        title = file.filename or "Untitled Document"
        doc = create_document(db, title=title, raw_text=raw_text, source=file.filename)
        background_tasks.add_task(_run_pipeline, doc.id)
        results.append(DocumentResponse(
            id=doc.id,
            title=doc.title,
            source=doc.source,
            upload_timestamp=doc.upload_timestamp,
            status=doc.status,
        ))
    return results


@router.get("/documents", response_model=list[DocumentResponse])
def get_documents(db: Session = Depends(get_db)):
    return list_documents(db)


@router.get("/documents/{document_id}", response_model=DocumentDetail)
def get_document_by_id(document_id: str, db: Session = Depends(get_db)):
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    docs = list_documents(db)
    meta = next((d for d in docs if d.id == document_id), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentDetail(
        id=doc.id,
        title=doc.title,
        raw_text=doc.raw_text,
        source=doc.source,
        upload_timestamp=doc.upload_timestamp,
        status=doc.status,
        clause_count=meta.clause_count,
        obligation_count=meta.obligation_count,
    )
