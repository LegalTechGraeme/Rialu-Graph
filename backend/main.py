from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_allowed_origins
from db.database import init_db
from routes import analysis, ingestion, query


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Rialu Graph",
    description="Multi-document legal intelligence system with NLP extraction and knowledge graph querying",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion.router)
app.include_router(analysis.router)
app.include_router(query.router)


@app.get("/")
def root():
    return {
        "name": "Rialu Graph",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
