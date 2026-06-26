"""Tests for repository scanner tool."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.agents.repository_analysis.tools.repository_scanner import scan_repository


def test_scan_repository_tool_on_react_project(tmp_path: Path) -> None:
    root = tmp_path / "react-app"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"react": "^18.0.0"},
                "scripts": {"build": "vite build", "start": "vite preview"},
            }
        ),
        encoding="utf-8",
    )

    result = scan_repository(str(root))
    assert "facts" in result
    assert "react" in result["facts"]["frameworks"]["frontend"]
    assert result["facts"]["commands"]["build"] == "vite build"
