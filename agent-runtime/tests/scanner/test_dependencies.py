"""Tests for dependency detector."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.detectors.dependencies import DependencyDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_categorizes_dependencies(tmp_path: Path) -> None:
    root = tmp_path / "deps"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"express": "4", "prisma": "5", "jsonwebtoken": "9"},
                "devDependencies": {"vitest": "1", "vite": "5"},
            }
        ),
        encoding="utf-8",
    )

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="deps", path=str(root)))
    DependencyDetector().detect(context, result)

    assert "express" in result.dependencies.production
    assert "vitest" in result.dependencies.development
    assert "express" in result.dependencies.categories.frameworks
    assert "Prisma" in result.dependencies.categories.databases
    assert result.dependencies.categories.testing
