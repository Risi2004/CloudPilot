"""Shared helpers for repository analysis tools."""

from __future__ import annotations

import json
from typing import Any

from cloudpilot.agents.repository_analysis.utils import session_keys
from cloudpilot.scanner.models import ScanResult


def resolve_repo_path(repo_path: str | None, tool_context: Any | None) -> str:
    """Resolve repository path from argument or ADK session state."""
    if repo_path and repo_path.strip():
        if tool_context is not None:
            tool_context.state[session_keys.REPO_PATH] = repo_path.strip()
        return repo_path.strip()

    if tool_context is not None:
        stored = tool_context.state.get(session_keys.REPO_PATH)
        if stored:
            return str(stored)

    raise ValueError("Repository path is required. Clone or provide a local path first.")


def store_scan_facts(tool_context: Any | None, facts: ScanResult) -> None:
    """Persist scan facts in session state when a tool context is available."""
    if tool_context is None:
        return
    tool_context.state[session_keys.SCAN_FACTS] = facts.model_dump()


def load_scan_facts(tool_context: Any | None) -> ScanResult:
    """Load validated scan facts from session state."""
    if tool_context is None:
        raise ValueError("Tool context is required to load scan facts.")

    raw = tool_context.state.get(session_keys.SCAN_FACTS)
    if not raw:
        raise ValueError("No scan facts found. Run scan_repository first.")

    if isinstance(raw, str):
        raw = json.loads(raw)
    return ScanResult.model_validate(raw)
