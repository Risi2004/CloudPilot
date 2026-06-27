"""Tests for knowledge sync service."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from cloudpilot.knowledge.models import SyncFileInput, SyncFileResult, SyncManifest
from cloudpilot.knowledge.sync_service import KnowledgeSyncService


def _build_service() -> KnowledgeSyncService:
    service = KnowledgeSyncService.__new__(KnowledgeSyncService)
    service._settings = MagicMock()
    service._settings.upsert_batch_size = 100
    service._chunker = MagicMock()
    service._embedder = MagicMock()
    service._vector_store = MagicMock()
    service._vector_store.count.return_value = 0
    service._vector_store.delete_by_document_ids.return_value = 0
    return service


def test_sync_skips_unchanged_files_in_manifest_counts() -> None:
    service = _build_service()

    with patch.object(service, "_sync_file", return_value=SyncFileResult(file_key="a", document_id="doc")) as mock_sync_file:
        report = service.synchronize(
            SyncManifest(
                files=[
                    SyncFileInput(
                        file_key="knowledge-base/render/a.md",
                        relative_path="render/a.md",
                        platform="render",
                        category="general",
                        content_hash="hash",
                        content="# Deploy",
                        is_new=True,
                    )
                ],
                unchanged_count=5,
            )
        )

    assert report.new_documents == 1
    assert report.unchanged_documents == 5
    mock_sync_file.assert_called_once()


def test_sync_deletes_removed_documents() -> None:
    service = _build_service()
    service._vector_store.delete_by_document_ids.return_value = 3

    report = service.synchronize(
        SyncManifest(deleted_document_ids=["doc-a", "doc-b"], unchanged_count=2)
    )

    assert report.deleted_documents == 2
    service._vector_store.delete_by_document_ids.assert_called_once_with(["doc-a", "doc-b"])
