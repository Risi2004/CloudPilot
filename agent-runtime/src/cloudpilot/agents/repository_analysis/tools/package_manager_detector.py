"""Package manager detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detector


def detect_package_manager(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """Detect package managers and lock files in a repository."""
    path = resolve_repo_path(repo_path, tool_context)
    return run_detector(path, "package_manager")
