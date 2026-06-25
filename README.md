# Legal Knowledge Graph Engine

A production-style legal AI system that ingests multiple legal documents, extracts structured legal meaning using NLP + rule-based logic, stores it in a database, and enables cross-document querying and knowledge graph visualization.

## Architecture

```
backend/                    FastAPI application
├── main.py                 App entry point
├── routes/
│   ├── ingestion.py        Document upload (single + batch)
│   ├── analysis.py         NLP processing pipeline
│   └── query.py            Cross-document query API
├── services/
│   ├── nlp_pipeline.py     spaCy extraction (entities, modality, time)
│   ├── clause_classifier.py Rule-based clause classification
│   ├── graph_builder.py    Knowledge graph construction
│   └── storage.py          Database operations & queries
├── models/schemas.py       Pydantic API schemas
└── db/
    ├── database.py         SQLAlchemy setup (SQLite)
    └── models.py           Documents, Clauses, Obligations, Conditions, Entities, Relationships

frontend/                   React + Vite + Cytoscape.js
├── src/
│   ├── App.jsx             Main application shell
│   └── components/
│       ├── UploadPanel.jsx      Single & batch upload
│       ├── ProcessingView.jsx   Pipeline status tracking
│       ├── Dashboard.jsx        Cross-document obligation dashboard
│       └── GraphVisualization.jsx  Interactive knowledge graph
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5174

### 3. Try Sample Documents

Upload the files in `sample_documents/` to see the system in action:
- `supply_agreement.txt` — Supplier/Buyer contract
- `lease_agreement.txt` — Landlord/Tenant lease
- `software_license.txt` — Licensor/Licensee agreement

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ingestion/upload` | Upload single document |
| POST | `/api/ingestion/upload/batch` | Batch upload multiple files |
| POST | `/api/ingestion/upload/text` | Upload pasted text |
| GET | `/api/ingestion/documents` | List all documents |
| GET | `/api/analysis/status` | Processing status per document |
| GET | `/api/query/obligations` | Query obligations (filter by actor, type, etc.) |
| GET | `/api/query/termination` | All termination clauses |
| GET | `/api/query/parties/stats` | Party obligation counts |
| GET | `/api/query/graph` | Full knowledge graph (nodes + edges) |

### Query Examples

```
GET /api/query/obligations?actor=Supplier
GET /api/query/obligations?clause_type=payment
GET /api/query/obligations?min_payment_days=30
GET /api/query/obligations?modality=shall
GET /api/query/graph?document_id=<id>
```

## Extraction Output Format

Every extracted sentence produces structured JSON:

```json
{
  "document_id": "abc-123",
  "sentence": "The Supplier shall deliver the Products within 14 days.",
  "clause_type": "obligation",
  "actor": "The Supplier",
  "action": "deliver",
  "object": "the Products",
  "conditions": [],
  "time_constraint": "within 14 days",
  "modality": "shall"
}
```

## Knowledge Graph Model

**Nodes:** Party, Obligation, Condition, Document

**Edges:** HAS_OBLIGATION, CONDITIONED_ON, BELONGS_TO, APPLIES_TO

## NLP Pipeline

1. **Sentence segmentation** — spaCy `doc.sents`
2. **Clause classification** — Rule-based (obligation, condition, definition, permission, termination, payment)
3. **Entity extraction** — Dependency parsing for actor/action/object
4. **Modality detection** — shall / must / may / will patterns
5. **Time constraints** — "within N days/weeks/months" regex
6. **Condition extraction** — if / provided that / subject to patterns
7. **Graph construction** — Relationships between parties, obligations, conditions, documents

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, spaCy, SQLite
- **Frontend:** React, Vite, Cytoscape.js
- **NLP:** spaCy `en_core_web_sm` with rule-based legal logic
