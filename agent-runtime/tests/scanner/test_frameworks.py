"""Tests for framework detector."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.detectors.frameworks import FrameworkDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_detects_express_from_package_json(tmp_path: Path) -> None:
    root = tmp_path / "api"
    root.mkdir()
    (root / "package.json").write_text(json.dumps({"dependencies": {"express": "4"}}), encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="api", path=str(root)))
    FrameworkDetector().detect(context, result)

    assert "express" in result.frameworks.backend


def test_detects_django_from_requirements_and_manage_py(tmp_path: Path) -> None:
    root = tmp_path / "django"
    root.mkdir()
    (root / "manage.py").write_text("print('ok')", encoding="utf-8")
    (root / "requirements.txt").write_text("django\n", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="django", path=str(root)))
    FrameworkDetector().detect(context, result)

    assert "django" in result.frameworks.backend


def test_plain_maven_pom_does_not_detect_spring_boot(tmp_path: Path) -> None:
    root = tmp_path / "plain-maven"
    root.mkdir()
    (root / "pom.xml").write_text(
        "<project><artifactId>demo</artifactId></project>",
        encoding="utf-8",
    )

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="plain-maven", path=str(root)))
    FrameworkDetector().detect(context, result)

    assert "spring boot" not in result.frameworks.backend


def test_spring_boot_marker_detected_in_pom(tmp_path: Path) -> None:
    root = tmp_path / "spring-app"
    root.mkdir()
    (root / "pom.xml").write_text(
        "<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent></project>",
        encoding="utf-8",
    )

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="spring-app", path=str(root)))
    FrameworkDetector().detect(context, result)

    assert "spring boot" in result.frameworks.backend
