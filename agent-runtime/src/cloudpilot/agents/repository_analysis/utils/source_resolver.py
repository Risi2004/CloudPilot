"""Resolve GitHub URLs and local paths to a scannable repository path."""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from cloudpilot.scanner.utils.filesystem import normalize_repo_path

_GITHUB_URL_PATTERN = re.compile(
    r"^https?://(?:www\.)?github\.com/(?P<owner>[\w.\-]+)/(?P<repo>[\w.\-]+?)(?:\.git)?(?:/.*)?$",
    re.IGNORECASE,
)


class SourceKind(str, Enum):
    """Type of repository source."""

    LOCAL_PATH = "local_path"
    GITHUB_URL = "github_url"


@dataclass(frozen=True, slots=True)
class ResolvedSource:
    """A resolved repository source."""

    kind: SourceKind
    value: str
    owner: str | None = None
    repo: str | None = None
    branch: str | None = None


def parse_github_url(url: str) -> ResolvedSource | None:
    """Parse a GitHub repository URL into owner/repo metadata."""
    match = _GITHUB_URL_PATTERN.match(url.strip())
    if not match:
        return None
    owner = match.group("owner")
    repo = match.group("repo")
    return ResolvedSource(
        kind=SourceKind.GITHUB_URL,
        value=url.strip(),
        owner=owner,
        repo=repo,
    )


def resolve_source(source: str) -> ResolvedSource:
    """
    Classify a source string as a local path or GitHub URL.

    Raises:
        FileNotFoundError: If a local path does not exist.
        ValueError: If the source is neither a valid path nor GitHub URL.
    """
    stripped = source.strip()
    if not stripped:
        raise ValueError("Repository source cannot be empty.")

    github = parse_github_url(stripped)
    if github:
        return github

    path = Path(stripped).expanduser()
    if path.exists():
        normalize_repo_path(path)
        return ResolvedSource(kind=SourceKind.LOCAL_PATH, value=str(path.resolve()))

    raise ValueError(f"Unsupported or missing repository source: {source}")
