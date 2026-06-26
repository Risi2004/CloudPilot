"""Environment variable template detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detector


def detect_environment(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Extract environment variable names from template files only.

    Never reads secret values from .env files.
    """
    path = resolve_repo_path(repo_path, tool_context)
    return run_detector(path, "environment")
