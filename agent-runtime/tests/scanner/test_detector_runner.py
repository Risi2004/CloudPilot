"""Tests for scanner detector runner."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from cloudpilot.scanner.detector_runner import run_detector, run_detectors
from cloudpilot.scanner.registry import resolve_execution_order
from cloudpilot.scanner.scan_session import clear_all, get_or_create_result


def _express_repo(tmp_path: Path) -> Path:
    root = tmp_path / "runner-express"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps({"dependencies": {"express": "^4.0.0", "mongoose": "^8.0.0"}}),
        encoding="utf-8",
    )
    return root


def test_resolve_execution_order_includes_prerequisites() -> None:
    order = resolve_execution_order(["database"])
    assert order.index("dependencies") < order.index("database")


def test_run_detector_database_includes_dependencies_prerequisite(tmp_path: Path) -> None:
    clear_all()
    root = _express_repo(tmp_path)
    result = run_detector(str(root), "database")
    assert "database" in result
    assert any(item["name"] == "Mongoose" for item in result["database"]["detected"])


def test_run_detectors_reuses_scan_session(tmp_path: Path) -> None:
    clear_all()
    root = _express_repo(tmp_path)
    run_detector(str(root), "frameworks")
    _, result = get_or_create_result(root)
    assert result.frameworks.backend == ["express"]


def test_unknown_detector_raises() -> None:
    with pytest.raises(ValueError, match="Unknown detector"):
        run_detector("/tmp", "not_a_detector")


def test_detector_failure_is_isolated(tmp_path: Path) -> None:
    clear_all()
    root = _express_repo(tmp_path)

    with patch("cloudpilot.scanner.detector_runner.get_detector") as mock_get:
        class BrokenDetector:
            name = "frameworks"

            def detect(self, context, result) -> None:
                raise RuntimeError("boom")

        class WorkingDetector:
            name = "runtime"

            def detect(self, context, result) -> None:
                from cloudpilot.scanner.detectors.runtime import RuntimeDetector

                RuntimeDetector().detect(context, result)

        def side_effect(name: str):
            if name == "frameworks":
                return BrokenDetector()
            return WorkingDetector()

        mock_get.side_effect = side_effect
        result = run_detectors(str(root), ["frameworks", "runtime"])

    assert "runtime" in result
    assert result["runtime"]["primary"] == "node.js"
