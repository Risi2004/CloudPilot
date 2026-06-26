"""Tests for shared manifest parsing."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.utils.manifests import collect_dependencies, collect_package_names_lower, parse_go_mod
from tests.conftest import build_context


def test_parse_go_mod_require_block() -> None:
    text = """
module example.com/demo

go 1.21

require (
    github.com/gin-gonic/gin v1.9.0
    github.com/lib/pq v1.10.9
)
"""
    modules = parse_go_mod(text)
    assert "github.com/gin-gonic/gin" in modules
    assert "github.com/lib/pq" in modules


def test_collect_dependencies_parses_go_mod(tmp_path: Path) -> None:
    root = tmp_path / "go-service"
    root.mkdir()
    (root / "go.mod").write_text(
        "module example.com/demo\n\ngo 1.21\n\nrequire github.com/lib/pq v1.10.9\n",
        encoding="utf-8",
    )
    context = build_context(root)
    production, _, source_files = collect_dependencies(context)
    assert "go.mod" in source_files
    assert "pq" in production


def test_collect_package_names_lower_normalizes_npm_case(tmp_path: Path) -> None:
    root = tmp_path / "react-app"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps({"dependencies": {"React": "^18.0.0"}}),
        encoding="utf-8",
    )
    context = build_context(root)
    names = collect_package_names_lower(context)
    assert "react" in names


def test_collect_dependencies_from_nested_package_json(tmp_path: Path) -> None:
    root = tmp_path / "monorepo"
    backend = root / "backend"
    frontend = root / "frontend"
    backend.mkdir(parents=True)
    frontend.mkdir(parents=True)
    (backend / "package.json").write_text(
        json.dumps({"dependencies": {"express": "^4.0.0", "mongoose": "^8.0.0"}}),
        encoding="utf-8",
    )
    (frontend / "package.json").write_text(
        json.dumps({"dependencies": {"react": "^18.0.0", "react-dom": "^18.0.0"}}),
        encoding="utf-8",
    )

    context = build_context(root)
    production, _, source_files = collect_dependencies(context)

    assert "backend/package.json" in source_files
    assert "frontend/package.json" in source_files
    assert "express" in production
    assert "mongoose" in production
    assert "react" in production
