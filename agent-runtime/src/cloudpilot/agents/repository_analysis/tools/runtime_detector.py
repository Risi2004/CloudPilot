"""Runtime detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detector


def detect_runtime(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Detect language runtimes and version files in a repository.

    Returns Node.js, Python, Java, Go, Rust, .NET, or PHP runtime facts.
    """
    path = resolve_repo_path(repo_path, tool_context)
    return run_detector(path, "runtime")
