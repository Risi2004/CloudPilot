"""Pydantic models for knowledge sync and retrieval."""

from __future__ import annotations

import hashlib
from typing import Any

from pydantic import BaseModel, Field, field_validator

from cloudpilot.knowledge.text_utils import sanitize_text_for_embedding


def document_id_from_file_key(file_key: str) -> str:
    """Stable document identifier derived from storage key."""
    return hashlib.sha256(file_key.encode("utf-8")).hexdigest()


class DocumentChunk(BaseModel):
    """A single indexed chunk of documentation."""

    chunk_id: str
    document_id: str
    text: str
    platform: str
    category: str
    source_file: str
    relative_path: str
    heading: str
    chunk_index: int
    content_hash: str
    document_version: str | None = None


class SyncFileInput(BaseModel):
    """One markdown file to synchronize."""

    file_key: str
    relative_path: str
    platform: str
    category: str = ""
    content_hash: str
    content: str
    document_version: str | None = None
    is_new: bool = False
    is_updated: bool = False

    @field_validator("content", "file_key", "relative_path", "platform", "category", "document_version")
    @classmethod
    def _sanitize_text_fields(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return sanitize_text_for_embedding(value)


class SyncFileResult(BaseModel):
    """Result of synchronizing a single file."""

    file_key: str
    document_id: str
    chunk_count: int = 0
    vector_ids: list[str] = Field(default_factory=list)
    embeddings_generated: int = 0
    status: str = "indexed"
    error: str | None = None


class SyncManifest(BaseModel):
    """Batch sync request from the backend orchestrator."""

    files: list[SyncFileInput] = Field(default_factory=list)
    deleted_document_ids: list[str] = Field(default_factory=list)
    unchanged_count: int = 0


class SyncError(BaseModel):
    """Per-file or batch sync error."""

    file_key: str | None = None
    message: str


class SyncReport(BaseModel):
    """Synchronization summary returned to the admin dashboard."""

    new_documents: int = 0
    updated_documents: int = 0
    deleted_documents: int = 0
    unchanged_documents: int = 0
    total_chunks_created: int = 0
    total_embeddings_generated: int = 0
    total_vectors: int = 0
    processing_time_ms: int = 0
    file_results: list[SyncFileResult] = Field(default_factory=list)
    errors: list[SyncError] = Field(default_factory=list)

    def to_json(self, *, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent, exclude_none=True)


class RetrievedChunk(BaseModel):
    """A chunk returned from semantic search."""

    chunk_id: str
    document_id: str
    text: str
    platform: str
    category: str
    source_file: str
    relative_path: str
    heading: str
    score: float


class Citation(BaseModel):
    """Source citation for a documentation answer."""

    source_file: str
    relative_path: str
    platform: str
    heading: str
    excerpt: str


class DocumentationAnswer(BaseModel):
    """Grounded documentation agent response."""

    answer: str
    citations: list[Citation] = Field(default_factory=list)
    confidence: str = "high"
    insufficient_documentation: bool = False
    retrieved_chunk_count: int = 0

    def to_json(self, *, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent, exclude_none=True)


class DocumentationQueryRequest(BaseModel):
    """Query request payload."""

    question: str
    repository_analysis: dict[str, Any] | None = None
    platform_filter: str | None = None
    top_k: int | None = None
