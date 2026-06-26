"""Architecture detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detector


def detect_architecture(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Classify repository architecture and notable project folders.

    Prerequisites (repository, frameworks) are run automatically via the scanner registry.
    """
    path = resolve_repo_path(repo_path, tool_context)
    return run_detector(path, "architecture")
