"""Knowledge-specific configuration (separate from chat ADK settings)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from cloudpilot.config.env import _load_env_files


@dataclass(frozen=True, slots=True)
class KnowledgeSettings:
    """Validated settings for embeddings, chunking, and vector storage."""

    embedding_model: str
    embedding_provider: str
    ollama_base_url: str
    chroma_persist_dir: Path
    vector_store: str
    chunk_size: int
    chunk_overlap: int
    top_k: int
    upsert_batch_size: int

    @property
    def litellm_embedding_model_id(self) -> str:
        return f"{self.embedding_provider}/{self.embedding_model}"


@lru_cache(maxsize=1)
def load_knowledge_settings() -> KnowledgeSettings:
    """Load knowledge settings from environment variables."""
    _load_env_files()

    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    persist_dir = Path(
        os.getenv("CHROMA_PERSIST_DIR", "./data/chroma").strip() or "./data/chroma"
    )

    return KnowledgeSettings(
        embedding_model=os.getenv("EMBEDDING_MODEL", "nomic-embed-text").strip()
        or "nomic-embed-text",
        embedding_provider=os.getenv("EMBEDDING_PROVIDER", "ollama").strip() or "ollama",
        ollama_base_url=base_url,
        chroma_persist_dir=persist_dir,
        vector_store=os.getenv("VECTOR_STORE", "chroma").strip().lower() or "chroma",
        chunk_size=int(os.getenv("KNOWLEDGE_CHUNK_SIZE", "1200")),
        chunk_overlap=int(os.getenv("KNOWLEDGE_CHUNK_OVERLAP", "200")),
        top_k=int(os.getenv("KNOWLEDGE_TOP_K", "8")),
        upsert_batch_size=int(os.getenv("KNOWLEDGE_UPSERT_BATCH_SIZE", "32")),
    )
