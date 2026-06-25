import os


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL") or "sqlite:///./legal_knowledge_graph.db"
    # Render/Heroku sometimes provide postgres:// — SQLAlchemy 2.x expects postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS") or "http://localhost:5174"
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def get_openai_api_key() -> str | None:
    """Reserved for future LLM-assisted extraction. Never commit the real value."""
    return os.getenv("OPENAI_API_KEY")
