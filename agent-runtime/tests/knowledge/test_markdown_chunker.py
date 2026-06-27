"""Tests for markdown chunker."""

from __future__ import annotations

from cloudpilot.knowledge.ingest.markdown_chunker import MarkdownChunker, derive_platform_category


def test_derive_platform_category_from_nested_path() -> None:
    platform, category = derive_platform_category("render/environment/variables.md")
    assert platform == "render"
    assert category == "environment"


def test_chunk_document_preserves_headings() -> None:
    content = "# Deploy\n\nRun `npm run build`.\n\n## Environment\n\nSet `PORT`."
    chunks = MarkdownChunker(chunk_size=500, chunk_overlap=50).chunk_document(
        file_key="knowledge-base/render/deploy.md",
        relative_path="render/deploy.md",
        content=content,
        content_hash="abc123",
    )
    assert chunks
    assert any("Deploy" in chunk.heading for chunk in chunks)
    assert chunks[0].platform == "render"


def test_chunk_document_deduplicates_identical_sections() -> None:
    content = "# Title\n\nSame text.\n\n# Title\n\nSame text."
    chunks = MarkdownChunker(chunk_size=500).chunk_document(
        file_key="knowledge-base/vercel/guide.md",
        relative_path="vercel/guide.md",
        content=content,
        content_hash="hash",
    )
    texts = [chunk.text for chunk in chunks]
    assert len(texts) == len(set(texts))
