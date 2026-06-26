"""Repository scanner orchestrator."""

from __future__ import annotations

import logging
import time
from pathlib import Path

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.detectors.base import Detector
from cloudpilot.scanner.models import RepositoryInfo, ScanResult
from cloudpilot.scanner.registry import default_detectors
from cloudpilot.scanner.scan_session import invalidate
from cloudpilot.scanner.utils.filesystem import normalize_repo_path

logger = logging.getLogger(__name__)


class RepositoryScanner:
    """Coordinate deterministic repository analysis detectors."""

    def __init__(self, detectors: list[Detector] | None = None) -> None:
        self._detectors = detectors or default_detectors()

    def scan(self, repo_path: str | Path) -> ScanResult:
        """
        Scan a local repository and return structured facts.

        Raises:
            FileNotFoundError: If the repository path does not exist.
            NotADirectoryError: If the path is not a directory.
        """
        started = time.perf_counter()
        root = normalize_repo_path(repo_path)
        invalidate(root)
        context = ScanContext.from_path(root)
        result = ScanResult(
            repository=RepositoryInfo(
                name=root.name,
                path=str(root),
            )
        )

        for detector in self._detectors:
            try:
                detector.detect(context, result)
            except Exception as exc:  # noqa: BLE001 - one detector must not fail entire scan
                logger.exception(
                    "Detector '%s' failed",
                    getattr(detector, "name", detector),
                    extra={"detector": getattr(detector, "name", str(detector)), "error": str(exc)},
                )

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "scan_complete",
            extra={
                "repo_path": str(root),
                "duration_ms": elapsed_ms,
                "file_count": len(context.files),
                "detector_count": len(self._detectors),
            },
        )
        return result
