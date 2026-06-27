"""Tests for knowledge text utilities."""

from __future__ import annotations

from cloudpilot.knowledge.text_utils import sanitize_text_for_embedding


def test_sanitize_text_removes_lone_surrogates() -> None:
    broken = "Hello \udc9d world"
    cleaned = sanitize_text_for_embedding(broken)
    cleaned.encode("utf-8")
    assert "\udc9d" not in cleaned
    assert "Hello" in cleaned


def test_sanitize_text_preserves_valid_unicode() -> None:
    text = "Deploy to Render 🚀 with café settings"
    assert sanitize_text_for_embedding(text) == text
