import re
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from db.models import Clause, Document, Obligation, Relationship
from models.schemas import (
    ClauseResponse,
    DocumentResponse,
    ObligationResponse,
    PartyStats,
    ProcessingStatus,
    QueryParams,
)


def create_document(db: Session, title: str, raw_text: str, source: Optional[str] = None) -> Document:
    doc = Document(title=title, raw_text=raw_text, source=source, status="pending")
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_document(db: Session, document_id: str) -> Optional[Document]:
    return db.query(Document).filter(Document.id == document_id).first()


def delete_document(db: Session, document_id: str) -> bool:
    doc = get_document(db, document_id)
    if not doc:
        return False
    db.query(Relationship).filter(Relationship.document_id == document_id).delete()
    db.delete(doc)
    db.commit()
    return True


def list_documents(db: Session) -> list[DocumentResponse]:
    docs = db.query(Document).order_by(Document.upload_timestamp.desc()).all()
    result = []
    for doc in docs:
        clause_count = db.query(Clause).filter(Clause.document_id == doc.id).count()
        obligation_count = (
            db.query(Obligation)
            .join(Clause)
            .filter(Clause.document_id == doc.id)
            .count()
        )
        result.append(DocumentResponse(
            id=doc.id,
            title=doc.title,
            source=doc.source,
            upload_timestamp=doc.upload_timestamp,
            status=doc.status,
            clause_count=clause_count,
            obligation_count=obligation_count,
        ))
    return result


def get_processing_status(db: Session) -> list[ProcessingStatus]:
    docs = db.query(Document).order_by(Document.upload_timestamp.desc()).all()
    statuses = []
    for doc in docs:
        clause_count = db.query(Clause).filter(Clause.document_id == doc.id).count()
        obligation_count = (
            db.query(Obligation)
            .join(Clause)
            .filter(Clause.document_id == doc.id)
            .count()
        )
        statuses.append(ProcessingStatus(
            document_id=doc.id,
            title=doc.title,
            status=doc.status,
            clauses_extracted=clause_count,
            obligations_extracted=obligation_count,
        ))
    return statuses


def query_obligations(db: Session, params: QueryParams) -> list[ObligationResponse]:
    query = (
        db.query(Obligation)
        .join(Clause)
        .join(Document)
        .options(joinedload(Obligation.clause).joinedload(Clause.document))
        .options(joinedload(Obligation.conditions))
    )

    if params.document_id:
        query = query.filter(Document.id == params.document_id)
    if params.actor:
        query = query.filter(Obligation.actor.ilike(f"%{params.actor}%"))
    if params.modality:
        query = query.filter(Obligation.modality == params.modality)
    if params.clause_type:
        query = query.filter(Clause.clause_type == params.clause_type)
    if params.search:
        query = query.filter(
            (Clause.sentence_text.ilike(f"%{params.search}%"))
            | (Obligation.action.ilike(f"%{params.search}%"))
            | (Obligation.object.ilike(f"%{params.search}%"))
        )
    if params.min_payment_days:
        query = query.filter(Clause.clause_type == "payment")
        obligations = query.all()
        filtered = []
        for obl in obligations:
            if obl.time_constraint:
                days = _parse_days(obl.time_constraint)
                if days and days > params.min_payment_days:
                    filtered.append(obl)
        return [_to_obligation_response(o) for o in filtered]

    obligations = query.all()
    return [_to_obligation_response(o) for o in obligations]


def query_termination_clauses(db: Session) -> list[ObligationResponse]:
    params = QueryParams(clause_type="termination")
    return query_obligations(db, params)


def get_party_stats(db: Session) -> list[PartyStats]:
    results = (
        db.query(Obligation.actor, func.count(Obligation.id))
        .filter(Obligation.actor.isnot(None))
        .group_by(Obligation.actor)
        .order_by(func.count(Obligation.id).desc())
        .all()
    )
    return [PartyStats(party=actor, obligation_count=count) for actor, count in results]


def get_document_clauses(db: Session, document_id: str) -> list[ClauseResponse]:
    clauses = (
        db.query(Clause)
        .filter(Clause.document_id == document_id)
        .order_by(Clause.sentence_index)
        .all()
    )
    results = []
    for clause in clauses:
        obligation = clause.obligations[0] if clause.obligations else None
        results.append(
            ClauseResponse(
                id=clause.id,
                document_id=clause.document_id,
                sentence_text=clause.sentence_text,
                clause_type=clause.clause_type,
                sentence_index=clause.sentence_index,
                actor=obligation.actor if obligation else None,
                action=obligation.action if obligation else None,
                object=obligation.object if obligation else None,
                modality=obligation.modality if obligation else None,
                time_constraint=obligation.time_constraint if obligation else None,
                conditions=[c.condition_text for c in obligation.conditions] if obligation else [],
            )
        )
    return results


def _to_obligation_response(obligation: Obligation) -> ObligationResponse:
    return ObligationResponse(
        id=obligation.id,
        clause_id=obligation.clause_id,
        document_id=obligation.clause.document_id,
        document_title=obligation.clause.document.title,
        sentence_text=obligation.clause.sentence_text,
        clause_type=obligation.clause.clause_type,
        actor=obligation.actor,
        action=obligation.action,
        object=obligation.object,
        modality=obligation.modality,
        time_constraint=obligation.time_constraint,
        conditions=[c.condition_text for c in obligation.conditions],
    )


def _parse_days(time_constraint: str) -> Optional[int]:
    match = re.search(r"(\d+)\s+(day|days|week|weeks|month|months)", time_constraint, re.I)
    if not match:
        return None
    num = int(match.group(1))
    unit = match.group(2).lower()
    if "week" in unit:
        return num * 7
    if "month" in unit:
        return num * 30
    return num
