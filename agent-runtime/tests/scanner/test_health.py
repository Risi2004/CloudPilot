"""Tests for health detector."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.detectors.commands import CommandsDetector
from cloudpilot.scanner.detectors.deployment import DeploymentDetector
from cloudpilot.scanner.detectors.environment import EnvironmentDetector
from cloudpilot.scanner.detectors.health import HealthDetector
from cloudpilot.scanner.detectors.package_manager import PackageManagerDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_reports_missing_artifacts(tmp_path: Path) -> None:
    root = tmp_path / "health"
    root.mkdir()
    (root / "package.json").write_text(json.dumps({"scripts": {"build": "vite build"}}), encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="health", path=str(root)))
    PackageManagerDetector().detect(context, result)
    EnvironmentDetector().detect(context, result)
    DeploymentDetector().detect(context, result)
    CommandsDetector().detect(context, result)
    HealthDetector().detect(context, result)

    codes = {issue.code for issue in result.health.issues}
    assert "missing_env_template" in codes
    assert "missing_lock_file" in codes
    assert "missing_dockerfile" in codes
    assert result.health.has_build_command is True
    assert result.health.has_start_command is False
