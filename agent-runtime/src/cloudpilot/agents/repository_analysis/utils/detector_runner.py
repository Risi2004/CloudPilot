"""Run individual scanner detectors for granular ADK tools (backward-compatible shim)."""

from cloudpilot.scanner.detector_runner import run_detector, run_detectors
from cloudpilot.scanner.registry import DETECTOR_SPECS

DETECTOR_ORDER = [(spec.name, spec.fields) for spec in DETECTOR_SPECS]
DETECTOR_MAP = {spec.name: spec.fields for spec in DETECTOR_SPECS}

__all__ = ["DETECTOR_MAP", "DETECTOR_ORDER", "run_detector", "run_detectors"]
