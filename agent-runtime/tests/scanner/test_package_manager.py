"""Tests for package manager detector."""

from __future__ import annotations

from pathlib import Path

from cloudpilot.scanner.detectors.package_manager import PackageManagerDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_detects_yarn_lockfile(tmp_path: Path) -> None:
    root = tmp_path / "yarn-app"
    root.mkdir()
    (root / "yarn.lock").write_text("# yarn\n", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="yarn-app", path=str(root)))
    PackageManagerDetector().detect(context, result)

    assert result.packageManager.primary == "yarn"
    assert "yarn.lock" in result.packageManager.lock_files[0]
