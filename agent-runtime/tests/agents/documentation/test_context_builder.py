"""Tests for documentation query helpers."""

from __future__ import annotations

from cloudpilot.agents.documentation.context_builder import (
    build_repository_context,
    fallback_answer,
)
from cloudpilot.knowledge.models import RetrievedChunk


def test_build_repository_context_from_analysis_payload() -> None:
    context = build_repository_context(
        {
            "facts": {
                "repository": {"name": "demo"},
                "frameworks": {"frontend": ["react"], "backend": ["express"]},
                "commands": {"build": "npm run build", "start": "npm start"},
                "deployment": {"detected_platforms": ["render"]},
            }
        }
    )
    assert context is not None
    assert "react" in context
    assert "render" in context.lower()


def test_fallback_answer_when_no_chunks() -> None:
    answer = fallback_answer("How do I deploy?", [])
    assert answer.insufficient_documentation is True
    assert "does not contain enough documentation" in answer.answer


def test_fallback_answer_uses_top_chunk() -> None:
    chunks = [
        RetrievedChunk(
            chunk_id="1:0",
            document_id="1",
            text="Use npm run build before deploying to Render.",
            platform="render",
            category="deployment",
            source_file="knowledge-base/render/deploy.md",
            relative_path="render/deploy.md",
            heading="Deploy",
            score=0.9,
        )
    ]
    answer = fallback_answer("How do I deploy?", chunks)
    assert "Render" in answer.answer
    assert answer.citations
