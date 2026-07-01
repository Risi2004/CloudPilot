"""ChromaDB vector store implementation."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

from cloudpilot.knowledge.models import DocumentChunk
from cloudpilot.knowledge.text_utils import sanitize_text_for_embedding
from cloudpilot.knowledge.vector.base import VectorSearchResult

if TYPE_CHECKING:
    import chromadb

logger = logging.getLogger(__name__)

COLLECTION_NAME = "cloudpilot_docs"


def _execute_with_retry(func, *args, max_retries=5, delay=0.5, **kwargs):
    import time
    last_exc = None
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            last_exc = exc
            exc_msg = str(exc).lower()
            if "lock" in exc_msg or "busy" in exc_msg:
                time.sleep(delay * (attempt + 1))
                continue
            raise exc
    raise last_exc


class ChromaVectorStore:
    """Persistent ChromaDB-backed vector store."""

    def __init__(self, persist_dir: Path) -> None:
        try:
            import chromadb as chromadb_module
        except ImportError as exc:
            raise ImportError(
                "chromadb is required for vector storage. Install with: pip install chromadb"
            ) from exc

        persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb_module.PersistentClient(path=str(persist_dir))
        self._collection = _execute_with_retry(
            self._client.get_or_create_collection,
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_chunks(self, chunks: list[DocumentChunk], embeddings: list[list[float]]) -> None:
        if not chunks:
            return
        if len(chunks) != len(embeddings):
            raise ValueError("chunks and embeddings length mismatch")

        ids = [chunk.chunk_id for chunk in chunks]
        documents = [sanitize_text_for_embedding(chunk.text) for chunk in chunks]
        metadatas = [
            {
                "document_id": chunk.document_id,
                "platform": sanitize_text_for_embedding(chunk.platform),
                "category": sanitize_text_for_embedding(chunk.category),
                "source_file": sanitize_text_for_embedding(chunk.source_file),
                "relative_path": sanitize_text_for_embedding(chunk.relative_path),
                "heading": sanitize_text_for_embedding(chunk.heading),
                "chunk_index": chunk.chunk_index,
                "content_hash": chunk.content_hash,
                "document_version": sanitize_text_for_embedding(chunk.document_version or ""),
            }
            for chunk in chunks
        ]
        _execute_with_retry(
            self._collection.upsert,
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

    def delete_by_document_id(self, document_id: str) -> int:
        return self.delete_by_document_ids([document_id])

    def delete_by_document_ids(self, document_ids: list[str]) -> int:
        if not document_ids:
            return 0
        deleted = 0
        for document_id in document_ids:
            existing = _execute_with_retry(self._collection.get, where={"document_id": document_id})
            count = len(existing.get("ids") or [])
            if count:
                _execute_with_retry(self._collection.delete, where={"document_id": document_id})
                deleted += count
                logger.info("Deleted %s vectors for document %s", count, document_id)
        return deleted

    def search(
        self,
        query_embedding: list[float],
        *,
        top_k: int = 8,
        platform: str | None = None,
    ) -> list[VectorSearchResult]:
        where = {"platform": platform} if platform else None
        results = _execute_with_retry(
            self._collection.query,
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        ids = (results.get("ids") or [[]])[0]
        documents = (results.get("documents") or [[]])[0]
        metadatas = (results.get("metadatas") or [[]])[0]
        distances = (results.get("distances") or [[]])[0]

        output: list[VectorSearchResult] = []
        for idx, chunk_id in enumerate(ids):
            metadata = metadatas[idx] if idx < len(metadatas) else {}
            output.append(
                VectorSearchResult(
                    chunk_id=chunk_id,
                    document_id=str(metadata.get("document_id", "")),
                    text=documents[idx] if idx < len(documents) else "",
                    metadata=metadata or {},
                    distance=float(distances[idx]) if idx < len(distances) else 1.0,
                )
            )
        return output

    def count(self) -> int:
        return int(_execute_with_retry(self._collection.count))

    def list_platforms(self) -> list[str]:
        """Return sorted unique platform names from indexed documentation."""
        results = _execute_with_retry(self._collection.get, include=["metadatas"])
        platforms: set[str] = set()
        for metadata in results.get("metadatas") or []:
            if metadata and metadata.get("platform"):
                platforms.add(str(metadata["platform"]).strip().lower())
        return sorted(platforms)
