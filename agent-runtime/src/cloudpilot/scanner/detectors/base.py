"""Detector interfaces."""

from __future__ import annotations

from typing import Protocol

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import ScanResult


class Detector(Protocol):
    """A deterministic repository analysis component."""

    name: str

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        """Mutate the scan result in place."""
