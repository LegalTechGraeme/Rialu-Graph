from sqlalchemy.orm import Session

from db.models import Clause, Condition, Document, Entity, Obligation, Relationship
from models.schemas import ExtractedSentence, GraphEdge, GraphNode, GraphResponse
from services.clause_classifier import classify_clause
from services.nlp_pipeline import (
    extract_actor_action_object,
    extract_conditions,
    extract_modality,
    extract_parties,
    extract_time_constraint,
    split_sentences,
)


def process_document(db: Session, document: Document) -> list[ExtractedSentence]:
    document.status = "processing"
    db.commit()

    sentences = split_sentences(document.raw_text)
    parties = extract_parties(document.raw_text)
    extracted: list[ExtractedSentence] = []

    for party_name, party_type in parties:
        existing = db.query(Entity).filter(
            Entity.document_id == document.id,
            Entity.name == party_name,
        ).first()
        if not existing:
            db.add(Entity(document_id=document.id, name=party_name, entity_type=party_type))

    for idx, sentence in enumerate(sentences):
        clause_type = classify_clause(sentence)
        actor, action, obj = extract_actor_action_object(sentence)
        modality = extract_modality(sentence)
        time_constraint = extract_time_constraint(sentence)
        conditions = extract_conditions(sentence)

        clause = Clause(
            document_id=document.id,
            sentence_text=sentence,
            clause_type=clause_type,
            sentence_index=idx,
        )
        db.add(clause)
        db.flush()

        obligation = None
        if clause_type in ("obligation", "payment", "permission", "termination"):
            obligation = Obligation(
                clause_id=clause.id,
                actor=actor,
                action=action,
                object=obj,
                modality=modality,
                time_constraint=time_constraint,
            )
            db.add(obligation)
            db.flush()

            for cond_text in conditions:
                db.add(Condition(obligation_id=obligation.id, condition_text=cond_text))

        extracted.append(
            ExtractedSentence(
                document_id=document.id,
                sentence=sentence,
                clause_type=clause_type,
                actor=actor,
                action=action,
                object=obj,
                conditions=conditions,
                time_constraint=time_constraint,
                modality=modality,
            )
        )

    db.flush()
    build_graph_for_document(db, document)
    document.status = "completed"
    db.commit()
    return extracted


def build_graph_for_document(db: Session, document: Document) -> None:
    db.query(Relationship).filter(Relationship.document_id == document.id).delete()

    doc_node_id = f"doc:{document.id}"
    db.add(Relationship(
        source_node=doc_node_id,
        source_type="Document",
        target_node=doc_node_id,
        target_type="Document",
        relationship_type="BELONGS_TO",
        document_id=document.id,
    ))

    entities = db.query(Entity).filter(Entity.document_id == document.id).all()
    for entity in entities:
        db.add(Relationship(
            source_node=f"party:{entity.id}",
            source_type="Party",
            target_node=doc_node_id,
            target_type="Document",
            relationship_type="BELONGS_TO",
            document_id=document.id,
        ))

    clauses = db.query(Clause).filter(Clause.document_id == document.id).all()
    for clause in clauses:
        clause_node_id = f"clause:{clause.id}"
        db.add(Relationship(
            source_node=clause_node_id,
            source_type="Clause",
            target_node=doc_node_id,
            target_type="Document",
            relationship_type="BELONGS_TO",
            document_id=document.id,
        ))

        for obligation in clause.obligations:
            obl_node_id = f"obligation:{obligation.id}"
            db.add(Relationship(
                source_node=obl_node_id,
                source_type="Obligation",
                target_node=clause_node_id,
                target_type="Clause",
                relationship_type="HAS_OBLIGATION",
                document_id=document.id,
            ))

            if obligation.actor:
                actor_key = obligation.actor.lower()
                matching_entity = next(
                    (e for e in entities if e.name.lower() in actor_key or actor_key in e.name.lower()),
                    None,
                )
                if matching_entity:
                    db.add(Relationship(
                        source_node=f"party:{matching_entity.id}",
                        source_type="Party",
                        target_node=obl_node_id,
                        target_type="Obligation",
                        relationship_type="APPLIES_TO",
                        document_id=document.id,
                    ))
                else:
                    db.add(Relationship(
                        source_node=f"actor:{actor_key}",
                        source_type="Party",
                        target_node=obl_node_id,
                        target_type="Obligation",
                        relationship_type="APPLIES_TO",
                        document_id=document.id,
                    ))

            for condition in obligation.conditions:
                cond_node_id = f"condition:{condition.id}"
                db.add(Relationship(
                    source_node=obl_node_id,
                    source_type="Obligation",
                    target_node=cond_node_id,
                    target_type="Condition",
                    relationship_type="CONDITIONED_ON",
                    document_id=document.id,
                ))


def get_full_graph(db: Session, document_id: str | None = None) -> GraphResponse:
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []
    edge_ids: set[str] = set()

    doc_query = db.query(Document)
    if document_id:
        doc_query = doc_query.filter(Document.id == document_id)
    documents = doc_query.all()

    for doc in documents:
        doc_node_id = f"doc:{doc.id}"
        nodes[doc_node_id] = GraphNode(
            id=doc_node_id,
            label=doc.title,
            type="Document",
            metadata={"document_id": doc.id, "source": doc.source},
        )

        for entity in doc.entities:
            node_id = f"party:{entity.id}"
            nodes[node_id] = GraphNode(
                id=node_id,
                label=entity.name,
                type="Party",
                metadata={"entity_type": entity.entity_type, "document_id": doc.id},
            )

        for clause in doc.clauses:
            for obligation in clause.obligations:
                node_id = f"obligation:{obligation.id}"
                nodes[node_id] = GraphNode(
                    id=node_id,
                    label=f"{obligation.action or 'obligation'}: {(obligation.object or '')[:40]}",
                    type="Obligation",
                    metadata={
                        "actor": obligation.actor,
                        "action": obligation.action,
                        "object": obligation.object,
                        "modality": obligation.modality,
                        "time_constraint": obligation.time_constraint,
                        "sentence": clause.sentence_text,
                        "clause_type": clause.clause_type,
                        "document_id": doc.id,
                        "document_title": doc.title,
                    },
                )

                for condition in obligation.conditions:
                    cond_id = f"condition:{condition.id}"
                    nodes[cond_id] = GraphNode(
                        id=cond_id,
                        label=condition.condition_text[:60],
                        type="Condition",
                        metadata={
                            "condition_text": condition.condition_text,
                            "document_id": doc.id,
                        },
                    )

    rel_query = db.query(Relationship)
    if document_id:
        rel_query = rel_query.filter(Relationship.document_id == document_id)
    relationships = rel_query.all()

    for rel in relationships:
        if rel.relationship_type == "BELONGS_TO" and rel.source_type == "Document":
            continue

        edge_id = f"{rel.source_node}->{rel.target_node}:{rel.relationship_type}"
        if edge_id in edge_ids:
            continue
        edge_ids.add(edge_id)

        if rel.source_type == "Party" and rel.source_node.startswith("actor:"):
            actor_name = rel.source_node.replace("actor:", "")
            if rel.source_node not in nodes:
                nodes[rel.source_node] = GraphNode(
                    id=rel.source_node,
                    label=actor_name.title(),
                    type="Party",
                    metadata={"entity_type": "party"},
                )

        edges.append(GraphEdge(
            id=edge_id,
            source=rel.source_node,
            target=rel.target_node,
            label=rel.relationship_type,
        ))

    return GraphResponse(nodes=list(nodes.values()), edges=edges)
