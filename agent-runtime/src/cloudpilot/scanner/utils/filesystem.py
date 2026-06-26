"""Filesystem helpers for repository scanning."""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_IGNORE_DIRS = frozenset(
    {
        ".git",
        "node_modules",
        ".venv",
        "venv",
        "__pycache__",
        ".pytest_cache",
        "dist",
        "build",
        ".next",
        ".nuxt",
        "coverage",
        ".turbo",
        ".cache",
        "target",
        "vendor",
    }
)

ENV_TEMPLATE_NAMES = frozenset(
    {
        ".env.example",
        ".env.sample",
        ".env.template",
        ".env.local.example",
    }
)


def normalize_repo_path(path: str | Path) -> Path:
    """Resolve and validate a repository path."""
    resolved = Path(path).expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Repository path does not exist: {resolved}")
    if not resolved.is_dir():
        raise NotADirectoryError(f"Repository path is not a directory: {resolved}")
    return resolved


def walk_repository(
    root: Path,
    *,
    ignore_dirs: frozenset[str] = DEFAULT_IGNORE_DIRS,
) -> tuple[list[Path], list[Path]]:
    """
    Walk the repository and return relative file and directory paths.

    Skips ignored directories and does not follow symlinks.
    """
    files: list[Path] = []
    directories: list[Path] = []

    for current_root, dir_names, file_names in _os_walk(root, ignore_dirs):
        rel_root = current_root.relative_to(root)
        if rel_root != Path("."):
            directories.append(rel_root)

        for file_name in file_names:
            files.append(rel_root / file_name)

    return files, directories


def _os_walk(root: Path, ignore_dirs: frozenset[str]):
    """Depth-first walk with in-place directory pruning."""
    import os

    for current_root, dir_names, file_names in os.walk(root, followlinks=False):
        current_path = Path(current_root)
        dir_names[:] = [name for name in dir_names if name not in ignore_dirs]
        yield current_path, dir_names, file_names


def read_text_file(root: Path, relative_path: Path, *, max_bytes: int = 512_000) -> str | None:
    """Read a UTF-8 text file safely, returning None on failure."""
    file_path = root / relative_path
    try:
        if not file_path.is_file():
            return None
        if file_path.stat().st_size > max_bytes:
            logger.warning("Skipping large file during scan: %s", relative_path)
            return None
        return file_path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        logger.warning("Failed to read %s: %s", relative_path, exc)
        return None


def path_exists(files: list[Path], candidates: set[str]) -> list[Path]:
    """Return relative paths that match any candidate filename (case-insensitive on Windows)."""
    normalized = {candidate.lower() for candidate in candidates}
    return [path for path in files if path.name.lower() in normalized]


def find_by_suffix(files: list[Path], suffix: str) -> list[Path]:
    """Return files ending with the given suffix."""
    return [path for path in files if path.name.lower().endswith(suffix.lower())]
