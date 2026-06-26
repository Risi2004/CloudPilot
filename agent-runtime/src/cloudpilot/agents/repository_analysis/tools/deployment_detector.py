"""Deployment and CI/CD detection tool."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.tools._helpers import resolve_repo_path
from cloudpilot.scanner import run_detectors


def detect_deployment(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Detect deployment configuration files and CI/CD systems.

    Returns Dockerfile, platform config files, and workflow evidence.
    """
    path = resolve_repo_path(repo_path, tool_context)
    return run_detectors(path, ["deployment", "cicd"])
