"""Shared scan context passed to all detectors."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cloudpilot.scanner.utils.filesystem import read_text_file, walk_repository
from cloudpilot.scanner.utils.git_info import GitMetadata, read_git_metadata
from cloudpilot.scanner.utils.parsers import parse_json, parse_toml


@dataclass
class ScanContext:
    """Repository state collected once and reused by detectors."""

    root: Path
    files: list[Path] = field(default_factory=list)
    directories: list[Path] = field(default_factory=list)
    git: GitMetadata = field(default_factory=lambda: GitMetadata(False))
    _text_cache: dict[str, str | None] = field(default_factory=dict, repr=False)
    _json_cache: dict[str, dict[str, Any] | None] = field(default_factory=dict, repr=False)
    _toml_cache: dict[str, dict[str, Any] | None] = field(default_factory=dict, repr=False)
    _names_lower: set[str] | None = field(default=None, repr=False)
    _by_name: dict[str, list[Path]] | None = field(default=None, repr=False)
    _by_suffix: dict[str, list[Path]] | None = field(default=None, repr=False)

    @classmethod
    def from_path(cls, repo_path: Path) -> ScanContext:
        """Build a scan context for a repository path."""
        files, directories = walk_repository(repo_path)
        return cls(
            root=repo_path,
            files=sorted(files),
            directories=sorted(directories),
            git=read_git_metadata(repo_path),
        )

    def _ensure_indexes(self) -> None:
        if self._by_name is not None:
            return
        by_name: dict[str, list[Path]] = {}
        by_suffix: dict[str, list[Path]] = {}
        names_lower: set[str] = set()
        for path in self.files:
            lower_name = path.name.lower()
            names_lower.add(lower_name)
            by_name.setdefault(lower_name, []).append(path)
            if "." in lower_name:
                suffix = lower_name[lower_name.rfind(".") :]
                by_suffix.setdefault(suffix, []).append(path)
        self._names_lower = names_lower
        self._by_name = by_name
        self._by_suffix = by_suffix

    def file_names(self) -> set[str]:
        """Return lowercase filenames present in the repository."""
        self._ensure_indexes()
        assert self._names_lower is not None
        return self._names_lower

    def has_file(self, name: str) -> bool:
        """Check whether a filename exists anywhere in the repository."""
        self._ensure_indexes()
        assert self._by_name is not None
        return name.lower() in self._by_name

    def find_files(self, name: str) -> list[Path]:
        """Return relative paths for files matching a filename."""
        self._ensure_indexes()
        assert self._by_name is not None
        return list(self._by_name.get(name.lower(), []))

    def find_suffix(self, suffix: str) -> list[Path]:
        """Return files whose names end with the given suffix."""
        self._ensure_indexes()
        assert self._by_suffix is not None
        normalized = suffix.lower()
        if not normalized.startswith("."):
            normalized = f".{normalized}"
        return list(self._by_suffix.get(normalized, []))

    def read_text(self, relative_path: Path) -> str | None:
        """Read and cache a text file relative to the repository root."""
        key = relative_path.as_posix()
        if key not in self._text_cache:
            self._text_cache[key] = read_text_file(self.root, relative_path)
        return self._text_cache[key]

    def read_json(self, relative_path: Path) -> dict[str, Any] | None:
        """Read and cache a JSON file relative to the repository root."""
        key = relative_path.as_posix()
        if key not in self._json_cache:
            self._json_cache[key] = parse_json(self.read_text(relative_path))
        return self._json_cache[key]

    def read_toml(self, relative_path: Path) -> dict[str, Any] | None:
        """Read and cache a TOML file relative to the repository root."""
        key = relative_path.as_posix()
        if key not in self._toml_cache:
            self._toml_cache[key] = parse_toml(self.read_text(relative_path))
        return self._toml_cache[key]

    def root_package_json(self) -> dict[str, Any] | None:
        """Return the root package.json when present."""
        return self.read_json(Path("package.json"))

    def package_json_paths(self) -> list[Path]:
        """Return all package.json paths, preferring the repository root first."""
        return sorted(
            self.find_files("package.json"),
            key=lambda path: (path.as_posix() != "package.json", path.as_posix()),
        )
