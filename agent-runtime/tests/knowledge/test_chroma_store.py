"""Tests for Chroma vector store."""

from __future__ import annotations

import pytest

pytest.importorskip("chromadb")

from cloudpilot.knowledge.models import DocumentChunk
from cloudpilot.knowledge.vector.chroma_store import ChromaVectorStore


def test_chroma_store_upsert_search_delete(tmp_path) -> None:
    store = ChromaVectorStore(tmp_path / "chroma")
    chunk = DocumentChunk(
        chunk_id="doc1:0",
        document_id="doc1",
        text="Deploy to Render using npm run build.",
        platform="render",
        category="deployment",
        source_file="knowledge-base/render/deploy.md",
        relative_path="render/deploy.md",
        heading="Deploy",
        chunk_index=0,
        content_hash="hash1",
    )
    embedding = [0.1, 0.2, 0.3, 0.4]

    store.upsert_chunks([chunk], [embedding])
    assert store.count() == 1

    results = store.search(embedding, top_k=1, platform="render")
    assert len(results) == 1
    assert "Render" in results[0].text

    deleted = store.delete_by_document_id("doc1")
    assert deleted == 1
    assert store.count() == 0
