"""Tests for report builder tool."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from cloudpilot.agents.repository_analysis.tools.report_builder import build_report
from cloudpilot.agents.repository_analysis.tools.repository_scanner import scan_repository


class _FakeState(dict):
  pass


class _FakeToolContext:
    def __init__(self) -> None:
        self.state = _FakeState()


def test_build_report_reads_session_facts(tmp_path: Path) -> None:
    root = tmp_path / "repo"
    root.mkdir()
    (root / "package.json").write_text(json.dumps({"name": "demo"}), encoding="utf-8")

    context = _FakeToolContext()
    scan_repository(str(root), tool_context=context)
    report = build_report(tool_context=context)

    assert report["ready_for_analysis"] is True
    assert report["facts"]["repository"]["name"] == "repo"


def test_build_report_requires_scan_facts() -> None:
    with pytest.raises(ValueError):
        build_report(tool_context=_FakeToolContext())
