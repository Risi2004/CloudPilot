"""Detector registry and specifications."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from cloudpilot.scanner.detectors.architecture import ArchitectureDetector
from cloudpilot.scanner.detectors.cicd import CicdDetector
from cloudpilot.scanner.detectors.commands import CommandsDetector
from cloudpilot.scanner.detectors.database import DatabaseDetector
from cloudpilot.scanner.detectors.dependencies import DependencyDetector
from cloudpilot.scanner.detectors.deployment import DeploymentDetector
from cloudpilot.scanner.detectors.environment import EnvironmentDetector
from cloudpilot.scanner.detectors.frameworks import FrameworkDetector
from cloudpilot.scanner.detectors.health import HealthDetector
from cloudpilot.scanner.detectors.package_manager import PackageManagerDetector
from cloudpilot.scanner.detectors.repository_info import RepositoryInfoDetector
from cloudpilot.scanner.detectors.runtime import RuntimeDetector

if TYPE_CHECKING:
    from cloudpilot.scanner.detectors.base import Detector


@dataclass(frozen=True, slots=True)
class DetectorSpec:
    """Metadata for a single repository scanner detector."""

    name: str
    fields: tuple[str, ...]
    prerequisites: tuple[str, ...]
    factory: type


DETECTOR_SPECS: tuple[DetectorSpec, ...] = (
    DetectorSpec("repository", ("repository",), (), RepositoryInfoDetector),
    DetectorSpec("frameworks", ("frameworks",), (), FrameworkDetector),
    DetectorSpec("runtime", ("runtime",), (), RuntimeDetector),
    DetectorSpec("package_manager", ("packageManager",), (), PackageManagerDetector),
    DetectorSpec("dependencies", ("dependencies",), (), DependencyDetector),
    DetectorSpec(
        "database",
        ("database",),
        ("dependencies",),
        DatabaseDetector,
    ),
    DetectorSpec("environment", ("environment",), (), EnvironmentDetector),
    DetectorSpec("deployment", ("deployment",), (), DeploymentDetector),
    DetectorSpec("cicd", ("cicd",), (), CicdDetector),
    DetectorSpec(
        "commands",
        ("commands",),
        ("package_manager",),
        CommandsDetector,
    ),
    DetectorSpec(
        "architecture",
        ("architecture",),
        ("repository", "frameworks"),
        ArchitectureDetector,
    ),
    DetectorSpec(
        "health",
        ("health",),
        (
            "repository",
            "package_manager",
            "commands",
            "environment",
            "deployment",
        ),
        HealthDetector,
    ),
)

DETECTOR_SPEC_MAP: dict[str, DetectorSpec] = {spec.name: spec for spec in DETECTOR_SPECS}

_detector_instances: dict[str, Detector] | None = None


def _get_detector_instances() -> dict[str, Detector]:
    global _detector_instances
    if _detector_instances is None:
        _detector_instances = {spec.name: spec.factory() for spec in DETECTOR_SPECS}
    return _detector_instances


def get_detector(name: str) -> Detector:
    """Return a cached detector instance by name."""
    instances = _get_detector_instances()
    if name not in instances:
        known = ", ".join(sorted(instances))
        raise ValueError(f"Unknown detector '{name}'. Known detectors: {known}")
    return instances[name]


def resolve_execution_order(detector_names: list[str]) -> list[str]:
    """
    Expand prerequisites and return detectors in dependency-safe order.

    Detectors are deduplicated; each runs at most once.
    """
    order: list[str] = []
    seen: set[str] = set()

    def visit(name: str) -> None:
        if name in seen:
            return
        if name not in DETECTOR_SPEC_MAP:
            known = ", ".join(sorted(DETECTOR_SPEC_MAP))
            raise ValueError(f"Unknown detector '{name}'. Known detectors: {known}")
        spec = DETECTOR_SPEC_MAP[name]
        for prerequisite in spec.prerequisites:
            visit(prerequisite)
        if name not in seen:
            order.append(name)
            seen.add(name)

    for name in detector_names:
        visit(name)

    return order


def default_detectors() -> list[Detector]:
    """Return the default ordered list of repository scanners."""
    instances = _get_detector_instances()
    return [instances[spec.name] for spec in DETECTOR_SPECS]
