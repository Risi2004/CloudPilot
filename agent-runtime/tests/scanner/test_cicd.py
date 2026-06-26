"""Tests for CI/CD detector."""

from __future__ import annotations

from pathlib import Path

from cloudpilot.scanner.detectors.cicd import CicdDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_detects_github_actions(tmp_path: Path) -> None:
    root = tmp_path / "ci"
    workflows = root / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI\n", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="ci", path=str(root)))
    CicdDetector().detect(context, result)

    assert any(system.name == "GitHub Actions" for system in result.cicd.systems)
