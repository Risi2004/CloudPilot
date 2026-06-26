"""Tests for commands detector."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.scanner.detectors.commands import CommandsDetector
from cloudpilot.scanner.detectors.package_manager import PackageManagerDetector
from cloudpilot.scanner.models import PackageManagerInfo, RepositoryInfo, ScanResult
from tests.conftest import build_context


def test_reads_package_json_scripts(tmp_path: Path) -> None:
    root = tmp_path / "commands"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps({"scripts": {"build": "tsc", "dev": "tsx watch src", "start": "node dist"}}),
        encoding="utf-8",
    )
    (root / "package-lock.json").write_text("{}", encoding="utf-8")

    context = build_context(root)
    result = ScanResult(
        repository=RepositoryInfo(name="commands", path=str(root)),
        packageManager=PackageManagerInfo(),
    )
    PackageManagerDetector().detect(context, result)
    CommandsDetector().detect(context, result)

    assert result.commands.install == "npm install"
    assert result.commands.build == "tsc"
    assert result.commands.dev == "tsx watch src"
    assert result.commands.start == "node dist"
