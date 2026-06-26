"""Tests for environment detector."""

from __future__ import annotations

from pathlib import Path

from cloudpilot.scanner.detectors.environment import EnvironmentDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_extracts_variable_names_only(tmp_path: Path) -> None:
    root = tmp_path / "env"
    root.mkdir()
    (root / ".env.example").write_text(
        "DATABASE_URL=postgres://secret\nSECRET_KEY=abc\n# comment\n",
        encoding="utf-8",
    )
    (root / ".env").write_text("SHOULD_NOT_READ=1\n", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="env", path=str(root)))
    EnvironmentDetector().detect(context, result)

    assert result.environment.variables == ["DATABASE_URL", "SECRET_KEY"]
    assert ".env" not in result.environment.template_files
