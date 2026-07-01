"""Secret masking utilities for deployment logs and responses."""

from __future__ import annotations

import re
from typing import Iterable

_MASK = "****"


def mask_secret(value: str | None) -> str:
    """Return a masked placeholder for any secret value."""
    if not value or not str(value).strip():
        return _MASK
    text = str(value).strip()
    if len(text) <= 4:
        return _MASK
    return f"{text[:2]}{'*' * (len(text) - 4)}{text[-2:]}"


def mask_env_vars(env_vars: dict[str, str] | None) -> dict[str, str]:
    """Mask environment variable values while preserving keys."""
    if not env_vars:
        return {}
    return {key: _MASK for key in env_vars}


def redact_logs(text: str, secrets: Iterable[str] | None = None) -> str:
    """Remove known secret substrings from log output."""
    if not text:
        return ""
    redacted = text
    for secret in secrets or []:
        if secret and len(secret) >= 4:
            redacted = redacted.replace(secret, _MASK)
    redacted = re.sub(
        r"(?i)(api[_-]?key|token|secret|password|authorization)\s*[=:]\s*\S+",
        r"\1=****",
        redacted,
    )
    return redacted
