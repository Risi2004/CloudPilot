"""Framework detection."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.knowledge import FRAMEWORK_RULES
from cloudpilot.scanner.models import FrameworkEvidence, FrameworksInfo, ScanResult
from cloudpilot.scanner.utils.manifests import collect_package_names_lower


class FrameworkDetector:
    """Detect frontend and backend frameworks from manifests and files."""

    name = "frameworks"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        package_names = collect_package_names_lower(context)
        file_names = context.file_names()
        detected: list[FrameworkEvidence] = []

        for framework_name, rule in FRAMEWORK_RULES.items():
            evidence: list[str] = []
            for package in rule["packages"]:
                if str(package).lower() in package_names:
                    evidence.append(f"dependency:{package}")

            for file_name in rule["files"]:
                if file_name.lower() in file_names:
                    evidence.append(f"file:{file_name}")

            if framework_name == "spring boot" and _has_spring_boot_marker(context):
                evidence.append("file:spring-boot marker")
            if framework_name == "asp.net" and context.find_suffix(".csproj"):
                evidence.append("file:*.csproj")

            if evidence:
                detected.append(
                    FrameworkEvidence(
                        name=framework_name,
                        category=rule["category"],  # type: ignore[arg-type]
                        evidence=evidence,
                    )
                )

        frontend = sorted({item.name for item in detected if item.category == "frontend"})
        backend = sorted({item.name for item in detected if item.category == "backend"})
        result.frameworks = FrameworksInfo(
            frontend=frontend,
            backend=backend,
            detected=sorted(detected, key=lambda item: item.name),
        )


def _has_spring_boot_marker(context: ScanContext) -> bool:
    for rel_path in [
        *context.find_files("pom.xml"),
        *context.find_files("build.gradle"),
        *context.find_files("build.gradle.kts"),
    ]:
        text = (context.read_text(rel_path) or "").lower()
        if "spring-boot" in text:
            return True
    return False
