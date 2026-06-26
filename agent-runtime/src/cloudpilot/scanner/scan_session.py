"""In-process scan session cache for repository analysis."""

from __future__ import annotations

from pathlib import Path

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from cloudpilot.scanner.utils.filesystem import normalize_repo_path

_sessions: dict[str, tuple[ScanContext, ScanResult]] = {}


def _session_key(repo_path: Path) -> str:
    return str(repo_path.resolve())


def get_context(repo_path: str | Path) -> ScanContext:
    """Return a cached scan context, building it on first access."""
    root = normalize_repo_path(repo_path)
    key = _session_key(root)
    if key not in _sessions:
        context = ScanContext.from_path(root)
        result = ScanResult(
            repository=RepositoryInfo(
                name=root.name,
                path=str(root),
            )
        )
        _sessions[key] = (context, result)
    return _sessions[key][0]


def get_or_create_result(repo_path: str | Path) -> tuple[ScanContext, ScanResult]:
    """Return cached context and scan result shell for a repository."""
    root = normalize_repo_path(repo_path)
    key = _session_key(root)
    if key not in _sessions:
        get_context(root)
    return _sessions[key]


def invalidate(repo_path: str | Path | None = None) -> None:
    """Clear cached scan session(s)."""
    if repo_path is None:
        _sessions.clear()
        return
    key = str(Path(repo_path).expanduser().resolve())
    _sessions.pop(key, None)


def clear_all() -> None:
    """Clear all cached scan sessions (alias for tests)."""
    invalidate()
