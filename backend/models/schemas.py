from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DocumentCreate(BaseModel):
    title: str
    raw_text: str
    source: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    title: str
    source: Optional[str] = None
    upload_timestamp: datetime
    status: str
    clause_count: int = 0
    obligation_count: int = 0

    model_config = {"from_attributes": True}


class DocumentDetail(BaseModel):
    id: str
    title: str
    raw_text: str
    source: Optional[str] = None
    upload_timestamp: datetime
    status: str
    clause_count: int = 0
    obligation_count: int = 0

    model_config = {"from_attributes": True}


class ExtractedSentence(BaseModel):
    document_id: str
    sentence: str
    clause_type: str
    actor: Optional[str] = None
    action: Optional[str] = None
    object: Optional[str] = None
    conditions: list[str] = Field(default_factory=list)
    time_constraint: Optional[str] = None
    modality: Optional[str] = None


class ObligationResponse(BaseModel):
    id: str
    clause_id: str
    document_id: str
    document_title: str
    sentence_text: str
    clause_type: str
    actor: Optional[str] = None
    action: Optional[str] = None
    object: Optional[str] = None
    modality: Optional[str] = None
    time_constraint: Optional[str] = None
    conditions: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # Party | Obligation | Condition | Document
    metadata: dict = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class QueryParams(BaseModel):
    actor: Optional[str] = None
    clause_type: Optional[str] = None
    modality: Optional[str] = None
    min_payment_days: Optional[int] = None
    document_id: Optional[str] = None
    search: Optional[str] = None


class ClauseResponse(BaseModel):
    id: str
    document_id: str
    sentence_text: str
    clause_type: str
    sentence_index: int
    actor: Optional[str] = None
    action: Optional[str] = None
    object: Optional[str] = None
    modality: Optional[str] = None
    time_constraint: Optional[str] = None
    conditions: list[str] = Field(default_factory=list)


class PartyStats(BaseModel):
    party: str
    obligation_count: int


class ProcessingStatus(BaseModel):
    document_id: str
    title: str
    status: str
    clauses_extracted: int = 0
    obligations_extracted: int = 0
