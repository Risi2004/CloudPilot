"""Build and start command detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detector


def detect_commands(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Detect install, build, development, and production start commands.

    Prerequisites (package_manager) are run automatically via the scanner registry.
    """
    path = resolve_repo_path(repo_path, tool_context)
    return run_detector(path, "commands")
