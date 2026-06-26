"""Git metadata helpers."""

from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class GitMetadata:
    """Git repository facts."""

    is_git_repository: bool
    default_branch: str | None = None


def read_git_metadata(repo_path: Path) -> GitMetadata:
    """Detect whether the path is a git repository and read the default branch."""
    git_dir = repo_path / ".git"
    if not git_dir.exists():
        return GitMetadata(is_git_repository=False)

    default_branch = _read_default_branch(repo_path)
    return GitMetadata(is_git_repository=True, default_branch=default_branch)


def _read_default_branch(repo_path: Path) -> str | None:
    commands = [
        ["git", "symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
        ["git", "branch", "--show-current"],
    ]
    for command in commands:
        try:
            result = subprocess.run(
                command,
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=False,
                timeout=5,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            logger.debug("Git command failed (%s): %s", command, exc)
            continue

        output = result.stdout.strip()
        if not output:
            continue
        if output.startswith("origin/"):
            return output.removeprefix("origin/")
        return output

    return None
