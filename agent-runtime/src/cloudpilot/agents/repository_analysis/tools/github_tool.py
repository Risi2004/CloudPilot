"""Clone a GitHub repository for analysis."""

from __future__ import annotations

import logging
from typing import Any

from cloudpilot.agents.repository_analysis.schemas import CloneRepositoryOutput
from cloudpilot.agents.repository_analysis.utils import session_keys
from cloudpilot.agents.repository_analysis.utils.github_clone import clone_github_repository
from cloudpilot.agents.repository_analysis.utils.source_resolver import parse_github_url
from cloudpilot.scanner.scan_session import invalidate

logger = logging.getLogger(__name__)


def clone_github_repo(repository_url: str, tool_context: Any | None = None) -> dict:
    """
    Clone a GitHub repository to a local temporary directory.

    Use this tool when the user provides a GitHub URL. After cloning, the local
    repository path is stored in session state for subsequent scan tools.

    Args:
        repository_url: Public or private GitHub repository URL.

    Returns:
        Local repository path, clone method, and repository metadata.
    """
    parsed = parse_github_url(repository_url)
    if not parsed:
        raise ValueError(f"Invalid GitHub repository URL: {repository_url}")

    logger.info("Cloning GitHub repository: %s", repository_url, extra={"repository_url": repository_url})
    result = clone_github_repository(parsed)
    invalidate(result.repo_path)

    if tool_context is not None:
        tool_context.state[session_keys.REPO_PATH] = result.repo_path
        tool_context.state[session_keys.SOURCE_URL] = repository_url
        tool_context.state[session_keys.CLONE_METHOD] = result.clone_method

    output = CloneRepositoryOutput(
        repo_path=result.repo_path,
        clone_method=result.clone_method,
        default_branch=result.default_branch,
        owner=result.owner,
        repo=result.repo,
    )
    return output.model_dump()
