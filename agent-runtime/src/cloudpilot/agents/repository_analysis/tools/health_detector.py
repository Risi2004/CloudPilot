"""Health and deployment readiness detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detector


def detect_health(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Report factual deployment readiness observations.

    Prerequisites are run automatically via the scanner registry.
    """
    path = resolve_repo_path(repo_path, tool_context)
    return run_detector(path, "health")
