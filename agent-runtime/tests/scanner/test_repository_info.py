"""Tests for repository info detector."""

from __future__ import annotations

from pathlib import Path

from cloudpilot.scanner.detectors.repository_info import RepositoryInfoDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_repository_counts_and_languages(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    (root / "src").mkdir(parents=True)
    (root / "src" / "main.ts").write_text("export {}", encoding="utf-8")
    (root / "src" / "util.py").write_text("print('x')", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name=root.name, path=str(root)))
    RepositoryInfoDetector().detect(context, result)

    assert result.repository.file_count == 2
    assert result.repository.directory_count == 1
    assert any(lang.name == "TypeScript" for lang in result.repository.languages)
    assert any(lang.name == "Python" for lang in result.repository.languages)


def test_monorepo_indicators(tmp_path: Path) -> None:
    root = tmp_path / "mono"
    root.mkdir()
    (root / "turbo.json").write_text("{}", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name=root.name, path=str(root)))
    RepositoryInfoDetector().detect(context, result)

    assert result.repository.is_monorepo is True
    assert "turbo.json" in result.repository.monorepo_indicators
