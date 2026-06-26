"""Tests for architecture detector."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.detectors.architecture import ArchitectureDetector
from cloudpilot.scanner.detectors.frameworks import FrameworkDetector
from cloudpilot.scanner.detectors.repository_info import RepositoryInfoDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_classifies_full_stack(tmp_path: Path) -> None:
    root = tmp_path / "fullstack"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps({"dependencies": {"react": "18", "express": "4"}}),
        encoding="utf-8",
    )
    (root / "src").mkdir()
    (root / "server").mkdir()

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="fullstack", path=str(root)))
    RepositoryInfoDetector().detect(context, result)
    FrameworkDetector().detect(context, result)
    ArchitectureDetector().detect(context, result)

    assert "full_stack" in result.architecture.types
    assert "src" in result.architecture.structure.folders
