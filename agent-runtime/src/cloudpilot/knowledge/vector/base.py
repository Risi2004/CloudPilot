"""Vector store abstraction — CloudPilot never imports ChromaDB outside implementations."""

from __future__ import annotations

from typing import Protocol

from cloudpilot.knowledge.models import DocumentChunk, RetrievedChunk


class VectorSearchResult:
    """Internal search result before mapping to RetrievedChunk."""

    __slots__ = ("chunk_id", "document_id", "text", "metadata", "distance")

    def __init__(
        self,
        *,
        chunk_id: str,
        document_id: str,
        text: str,
        metadata: dict,
        distance: float,
    ) -> None:
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.text = text
        self.metadata = metadata
        self.distance = distance

    def to_retrieved_chunk(self) -> RetrievedChunk:
        score = max(0.0, 1.0 - self.distance) if self.distance <= 1.0 else 1.0 / (1.0 + self.distance)
        return RetrievedChunk(
            chunk_id=self.chunk_id,
            document_id=self.document_id,
            text=self.text,
            platform=str(self.metadata.get("platform", "")),
            category=str(self.metadata.get("category", "")),
            source_file=str(self.metadata.get("source_file", "")),
            relative_path=str(self.metadata.get("relative_path", "")),
            heading=str(self.metadata.get("heading", "")),
            score=round(score, 4),
        )


class VectorStore(Protocol):
    """Interface for pluggable vector databases."""

    def upsert_chunks(self, chunks: list[DocumentChunk], embeddings: list[list[float]]) -> None:
        """Insert or update chunk vectors."""

    def delete_by_document_id(self, document_id: str) -> int:
        """Remove all vectors belonging to a document."""

    def delete_by_document_ids(self, document_ids: list[str]) -> int:
        """Remove vectors for multiple documents."""

    def search(
        self,
        query_embedding: list[float],
        *,
        top_k: int = 8,
        platform: str | None = None,
    ) -> list[VectorSearchResult]:
        """Semantic search with optional platform filter."""

    def count(self) -> int:
        """Total vectors in the collection."""
