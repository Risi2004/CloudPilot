"""Run individual scanner detectors for granular analysis tools."""

from __future__ import annotations

import logging
import time
from typing import Any

from cloudpilot.scanner.registry import DETECTOR_SPEC_MAP, get_detector, resolve_execution_order
from cloudpilot.scanner.scan_session import get_or_create_result
from cloudpilot.scanner.utils.filesystem import normalize_repo_path

logger = logging.getLogger(__name__)


def _run_detector_safe(detector_name: str, context: Any, result: Any) -> None:
    detector = get_detector(detector_name)
    try:
        detector.detect(context, result)
    except Exception as exc:  # noqa: BLE001 - one detector must not fail entire scan
        logger.exception(
            "Detector '%s' failed",
            detector_name,
            extra={"detector": detector_name, "error": str(exc)},
        )


def run_detector(repo_path: str, detector_name: str) -> dict[str, Any]:
    """
    Run a scanner detector (and its prerequisites) and return its section(s).

    Raises:
        ValueError: If the detector name is unknown.
    """
    return run_detectors(repo_path, [detector_name])


def run_detectors(repo_path: str, detector_names: list[str]) -> dict[str, Any]:
    """Run multiple detectors against one shared cached scan result."""
    if not detector_names:
        return {}

    started = time.perf_counter()
    root = normalize_repo_path(repo_path)
    execution_order = resolve_execution_order(detector_names)
    context, result = get_or_create_result(root)

    for name in execution_order:
        _run_detector_safe(name, context, result)

    payload = result.model_dump()
    output_fields: set[str] = set()
    for name in detector_names:
        output_fields.update(DETECTOR_SPEC_MAP[name].fields)

    merged = {field: payload[field] for field in output_fields}
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "detectors_complete",
        extra={
            "repo_path": str(root),
            "detectors": execution_order,
            "duration_ms": elapsed_ms,
        },
    )
    return merged
