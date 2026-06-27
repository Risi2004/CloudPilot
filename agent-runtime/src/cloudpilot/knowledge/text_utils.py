"""Text normalization helpers for embedding and vector storage."""

from __future__ import annotations

import re

# Lone UTF-16 surrogates are valid in Python str but cannot be encoded to UTF-8.
_SURROGATE_RE = re.compile(r"[\ud800-\udfff]")


def sanitize_text_for_embedding(text: str) -> str:
    """
    Remove invalid Unicode so HTTP/JSON UTF-8 encoding succeeds.

    Some scraped docs contain lone surrogate code points (e.g. broken emoji),
    which raises: 'utf-8' codec can't encode character '\\udc9d' ...
    """
    if not text:
        return text
    if _SURROGATE_RE.search(text):
        text = _SURROGATE_RE.sub("\ufffd", text)
    # Belt-and-suspenders: ensure strict UTF-8 round-trip.
    return text.encode("utf-8", "replace").decode("utf-8")
