from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.schemas import ClauseResponse, GraphResponse, ObligationResponse, PartyStats, QueryParams
from services.graph_builder import get_full_graph
from services.storage import get_document_clauses, get_party_stats, query_obligations, query_termination_clauses

router = APIRouter(prefix="/api/query", tags=["query"])


@router.get("/obligations", response_model=list[ObligationResponse])
def get_obligations(
    actor: str | None = Query(None),
    clause_type: str | None = Query(None),
    modality: str | None = Query(None),
    min_payment_days: int | None = Query(None),
    document_id: str | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    params = QueryParams(
        actor=actor,
        clause_type=clause_type,
        modality=modality,
        min_payment_days=min_payment_days,
        document_id=document_id,
        search=search,
    )
    return query_obligations(db, params)


@router.get("/termination", response_model=list[ObligationResponse])
def get_termination_clauses(db: Session = Depends(get_db)):
    return query_termination_clauses(db)


@router.get("/parties/stats", response_model=list[PartyStats])
def get_parties_stats(db: Session = Depends(get_db)):
    return get_party_stats(db)


@router.get("/clauses", response_model=list[ClauseResponse])
def get_clauses(
    document_id: str = Query(...),
    db: Session = Depends(get_db),
):
    return get_document_clauses(db, document_id)


@router.get("/graph", response_model=GraphResponse)
def get_graph(
    document_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return get_full_graph(db, document_id)
