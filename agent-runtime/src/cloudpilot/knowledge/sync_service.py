"""Incremental knowledge base synchronization."""

from __future__ import annotations

import logging
import time

from cloudpilot.knowledge.config import load_knowledge_settings
from cloudpilot.knowledge.embeddings import EmbeddingService
from cloudpilot.knowledge.ingest.markdown_chunker import MarkdownChunker
from cloudpilot.knowledge.models import (
    SyncError,
    SyncFileInput,
    SyncFileResult,
    SyncManifest,
    SyncReport,
    document_id_from_file_key,
)
from cloudpilot.knowledge.vector.factory import get_vector_store

logger = logging.getLogger(__name__)


class KnowledgeSyncService:
    """Synchronize markdown documentation into the vector store."""

    def __init__(self) -> None:
        self._settings = load_knowledge_settings()
        self._chunker = MarkdownChunker(
            chunk_size=self._settings.chunk_size,
            chunk_overlap=self._settings.chunk_overlap,
        )
        self._embedder = EmbeddingService(self._settings)
        self._vector_store = get_vector_store()

    def synchronize(self, manifest: SyncManifest) -> SyncReport:
        """Process changed/new/deleted documents from the backend manifest."""
        started = time.perf_counter()
        report = SyncReport(unchanged_documents=manifest.unchanged_count)

        if manifest.deleted_document_ids:
            deleted_vectors = self._vector_store.delete_by_document_ids(manifest.deleted_document_ids)
            report.deleted_documents = len(manifest.deleted_document_ids)
            logger.info(
                "Removed %s vectors for %s deleted documents",
                deleted_vectors,
                report.deleted_documents,
            )

        for file_input in manifest.files:
            result = self._sync_file(file_input, report)
            report.file_results.append(result)
            if result.error:
                report.errors.append(SyncError(file_key=file_input.file_key, message=result.error))
                continue

            if file_input.is_new:
                report.new_documents += 1
            elif file_input.is_updated:
                report.updated_documents += 1

            report.total_chunks_created += result.chunk_count
            report.total_embeddings_generated += result.embeddings_generated

        report.total_vectors = self._vector_store.count()
        report.processing_time_ms = int((time.perf_counter() - started) * 1000)
        return report

    def _sync_file(self, file_input: SyncFileInput, report: SyncReport) -> SyncFileResult:
        document_id = document_id_from_file_key(file_input.file_key)
        try:
            self._vector_store.delete_by_document_id(document_id)
            chunks = self._chunker.chunk_document(
                file_key=file_input.file_key,
                relative_path=file_input.relative_path,
                content=file_input.content,
                platform=file_input.platform,
                category=file_input.category,
                content_hash=file_input.content_hash,
                document_version=file_input.document_version,
            )

            if not chunks:
                return SyncFileResult(
                    file_key=file_input.file_key,
                    document_id=document_id,
                    chunk_count=0,
                    vector_ids=[],
                    embeddings_generated=0,
                    status="indexed",
                )

            embeddings_generated = 0
            vector_ids: list[str] = []
            batch_size = self._settings.upsert_batch_size

            for start in range(0, len(chunks), batch_size):
                batch = chunks[start : start + batch_size]
                embeddings = self._embedder.embed_texts([chunk.text for chunk in batch])
                self._vector_store.upsert_chunks(batch, embeddings)
                embeddings_generated += len(embeddings)
                vector_ids.extend(chunk.chunk_id for chunk in batch)
                if start + batch_size < len(chunks):
                    time.sleep(0.5)

            logger.info(
                "Indexed %s chunks for %s",
                len(chunks),
                file_input.file_key,
                extra={"document_id": document_id, "platform": file_input.platform},
            )
            return SyncFileResult(
                file_key=file_input.file_key,
                document_id=document_id,
                chunk_count=len(chunks),
                vector_ids=vector_ids,
                embeddings_generated=embeddings_generated,
                status="indexed",
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to sync %s", file_input.file_key)
            return SyncFileResult(
                file_key=file_input.file_key,
                document_id=document_id,
                status="failed",
                error=str(exc),
            )
