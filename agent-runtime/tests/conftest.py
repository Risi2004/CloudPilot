"""Shared pytest helpers for repository scanner tests."""

from __future__ import annotations

from pathlib import Path

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import ScanResult
from cloudpilot.scanner.scanner import RepositoryScanner


def scan_repo(path: Path) -> ScanResult:
    """Scan a temporary repository path."""
    return RepositoryScanner().scan(path)


def build_context(path: Path) -> ScanContext:
    """Build a scan context for detector unit tests."""
    return ScanContext.from_path(path)
