"""Manifest parsing helpers."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def parse_json(text: str | None) -> dict[str, Any] | None:
    """Parse JSON text into a dictionary."""
    if not text:
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Invalid JSON content: %s", exc)
        return None
    return data if isinstance(data, dict) else None


def parse_toml(text: str | None) -> dict[str, Any] | None:
    """Parse TOML text into a dictionary."""
    if not text:
        return None
    try:
        import tomllib
    except ModuleNotFoundError:  # pragma: no cover - Python <3.11 fallback
        logger.warning("tomllib unavailable; skipping TOML parse")
        return None

    try:
        return tomllib.loads(text)
    except Exception as exc:  # noqa: BLE001 - parser errors vary by version
        logger.warning("Invalid TOML content: %s", exc)
        return None


def parse_requirements(text: str | None) -> list[str]:
    """Extract package names from requirements.txt-style files."""
    if not text:
        return []

    packages: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        name = re.split(r"[<>=!~\[]", line, maxsplit=1)[0].strip()
        if name:
            packages.append(name)
    return packages


def merge_dependency_names(*groups: dict[str, Any] | None) -> tuple[list[str], list[str]]:
    """Merge npm-style dependencies and devDependencies."""
    production: set[str] = set()
    development: set[str] = set()

    for group in groups:
        if not group:
            continue
        for key in group.get("dependencies", {}) or {}:
            production.add(str(key))
        for key in group.get("devDependencies", {}) or {}:
            development.add(str(key))
        for key in group.get("peerDependencies", {}) or {}:
            production.add(str(key))

    return sorted(production), sorted(development)


def composer_packages(data: dict[str, Any] | None) -> tuple[list[str], list[str]]:
    """Extract Composer production and development package names."""
    if not data:
        return [], []
    production = sorted((data.get("require") or {}).keys())
    development = sorted((data.get("require-dev") or {}).keys())
    return production, development
