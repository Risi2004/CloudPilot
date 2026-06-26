"""Dependency detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detector


def detect_dependencies(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Read dependency manifests and categorize major libraries.

    Returns production and development dependency names plus categories.
    """
    path = resolve_repo_path(repo_path, tool_context)
    return run_detector(path, "dependencies")
