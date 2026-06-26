"""Tests for database detector."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.detectors.database import DatabaseDetector
from cloudpilot.scanner.detectors.dependencies import DependencyDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_detects_prisma_from_dependency_and_schema(tmp_path: Path) -> None:
    root = tmp_path / "db"
    root.mkdir()
    (root / "package.json").write_text(json.dumps({"dependencies": {"@prisma/client": "5"}}), encoding="utf-8")
    (root / "prisma").mkdir()
    (root / "prisma" / "schema.prisma").write_text("datasource db {}", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="db", path=str(root)))
    DependencyDetector().detect(context, result)
    DatabaseDetector().detect(context, result)

    assert any(item.name == "Prisma" for item in result.database.detected)
