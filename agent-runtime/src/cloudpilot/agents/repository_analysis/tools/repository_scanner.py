"""Run the full deterministic repository scanner."""

from __future__ import annotations

import logging
from typing import Any

from cloudpilot.agents.repository_analysis.schemas import ScanRepositoryOutput
from cloudpilot.agents.repository_analysis.tools._helpers import (
    resolve_repo_path,
    store_scan_facts,
)
from cloudpilot.scanner import RepositoryScanner
from cloudpilot.scanner.scan_session import invalidate

logger = logging.getLogger(__name__)


def scan_repository(repo_path: str | None = None, tool_context: Any | None = None) -> dict:
    """
    Scan a local repository and return structured facts.

    Prefer this tool over calling individual detector tools. It runs the full
    CloudPilot repository scanner and stores the result in session state.

    Args:
        repo_path: Optional local repository path. Uses the cloned path from
            session state when omitted.

    Returns:
        Complete structured scan facts for the repository.
    """
    path = resolve_repo_path(repo_path, tool_context)
    invalidate(path)
    logger.info("Scanning repository: %s", path, extra={"repo_path": path})
    facts = RepositoryScanner().scan(path)
    store_scan_facts(tool_context, facts)
    return ScanRepositoryOutput(facts=facts).model_dump()
