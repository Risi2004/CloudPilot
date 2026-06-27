"""Vector store factory."""

from __future__ import annotations

from functools import lru_cache

from cloudpilot.knowledge.config import load_knowledge_settings
from cloudpilot.knowledge.vector.base import VectorStore
from cloudpilot.knowledge.vector.chroma_store import ChromaVectorStore


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    """Return the configured vector store implementation."""
    settings = load_knowledge_settings()
    if settings.vector_store != "chroma":
        raise ValueError(
            f"Unsupported VECTOR_STORE '{settings.vector_store}'. Only 'chroma' is implemented."
        )
    return ChromaVectorStore(settings.chroma_persist_dir)
