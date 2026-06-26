"""Tests for scan context file indexes."""

from __future__ import annotations

from pathlib import Path

from tests.conftest import build_context


def test_file_indexes_are_consistent(tmp_path: Path) -> None:
    root = tmp_path / "indexed-repo"
    root.mkdir()
    nested = root / "src"
    nested.mkdir()
    (nested / "App.tsx").write_text("export {}", encoding="utf-8")
    (root / "package.json").write_text("{}", encoding="utf-8")

    context = build_context(root)
    assert context.has_file("package.json")
    assert context.has_file("App.tsx")
    assert context.find_files("package.json") == [Path("package.json")]
    assert context.find_suffix(".tsx") == [Path("src/App.tsx")]
    assert "app.tsx" in context.file_names()
    assert context.file_names() is context.file_names()
