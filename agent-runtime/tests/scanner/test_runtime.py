"""Tests for runtime detector."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.detectors.runtime import RuntimeDetector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_detects_node_runtime(tmp_path: Path) -> None:
    root = tmp_path / "node"
    root.mkdir()
    (root / "package.json").write_text(json.dumps({"engines": {"node": ">=20"}}), encoding="utf-8")
    (root / ".nvmrc").write_text("20\n", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="node", path=str(root)))
    RuntimeDetector().detect(context, result)

    assert result.runtime.primary == "node.js"
    assert any(runtime.version and "20" in runtime.version for runtime in result.runtime.runtimes)


def test_detects_go_runtime(tmp_path: Path) -> None:
    root = tmp_path / "go"
    root.mkdir()
    (root / "go.mod").write_text("module example.com/app\n\ngo 1.22\n", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(repository=RepositoryInfo(name="go", path=str(root)))
    RuntimeDetector().detect(context, result)

    assert result.runtime.primary == "go"
    assert any(runtime.version == "1.22" for runtime in result.runtime.runtimes)
