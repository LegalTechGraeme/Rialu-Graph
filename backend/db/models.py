import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship

from db.database import Base


def _uuid():
    return str(uuid.uuid4())


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    source = Column(String, nullable=True)
    upload_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="pending")  # pending | processing | completed | failed

    clauses = relationship("Clause", back_populates="document", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="document", cascade="all, delete-orphan")


class Clause(Base):
    __tablename__ = "clauses"

    id = Column(String, primary_key=True, default=_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    sentence_text = Column(Text, nullable=False)
    clause_type = Column(String, nullable=False)
    sentence_index = Column(Integer, default=0)

    document = relationship("Document", back_populates="clauses")
    obligations = relationship("Obligation", back_populates="clause", cascade="all, delete-orphan")


class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(String, primary_key=True, default=_uuid)
    clause_id = Column(String, ForeignKey("clauses.id"), nullable=False)
    actor = Column(String, nullable=True)
    action = Column(String, nullable=True)
    object = Column(String, nullable=True)
    modality = Column(String, nullable=True)
    time_constraint = Column(String, nullable=True)

    clause = relationship("Clause", back_populates="obligations")
    conditions = relationship("Condition", back_populates="obligation", cascade="all, delete-orphan")


class Condition(Base):
    __tablename__ = "conditions"

    id = Column(String, primary_key=True, default=_uuid)
    obligation_id = Column(String, ForeignKey("obligations.id"), nullable=False)
    condition_text = Column(Text, nullable=False)

    obligation = relationship("Obligation", back_populates="conditions")


class Entity(Base):
    __tablename__ = "entities"

    id = Column(String, primary_key=True, default=_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    name = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)  # party | asset | other

    document = relationship("Document", back_populates="entities")


class Relationship(Base):
    __tablename__ = "relationships"

    id = Column(String, primary_key=True, default=_uuid)
    source_node = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    target_node = Column(String, nullable=False)
    target_type = Column(String, nullable=False)
    relationship_type = Column(String, nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
