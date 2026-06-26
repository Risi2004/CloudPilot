"""Tests for deployment detector."""

from __future__ import annotations

from pathlib import Path

from cloudpilot.scanner.detectors.deployment import DeploymentDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_detects_deployment_files(tmp_path: Path) -> None:
    root = tmp_path / "deploy"
    root.mkdir()
    (root / "Dockerfile").write_text("FROM node", encoding="utf-8")
    (root / "vercel.json").write_text("{}", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="deploy", path=str(root)))
    DeploymentDetector().detect(context, result)

    assert "docker" in result.deployment.detected_platforms
    assert "vercel" in result.deployment.detected_platforms
    assert len(result.deployment.files) == 2
