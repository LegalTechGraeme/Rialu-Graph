from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.schemas import ExtractedSentence, ProcessingStatus
from services.graph_builder import process_document
from services.storage import get_document, get_processing_status

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/process/{document_id}", response_model=list[ExtractedSentence])
def process_document_endpoint(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    document = get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return process_document(db, document)


@router.get("/status", response_model=list[ProcessingStatus])
def get_status(db: Session = Depends(get_db)):
    return get_processing_status(db)


@router.get("/status/{document_id}", response_model=ProcessingStatus)
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    statuses = get_processing_status(db)
    for s in statuses:
        if s.document_id == document_id:
            return s
    raise HTTPException(status_code=404, detail="Document not found")
