"""Dependency analysis."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.knowledge import (
    API_PACKAGES,
    AUTH_PACKAGES,
    BUILD_TOOL_PACKAGES,
    DATABASE_PACKAGES,
    FRAMEWORK_RULES,
    TEST_PACKAGES,
)
from cloudpilot.scanner.models import DependenciesInfo, DependencyCategories, ScanResult
from cloudpilot.scanner.utils.manifests import collect_dependencies


class DependencyDetector:
    """Read dependency manifests and categorize package names."""

    name = "dependencies"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        production, development, source_files = collect_dependencies(context)
        all_packages = production | development
        categories = DependencyCategories(
            frameworks=_match_framework_packages(all_packages),
            databases=sorted(
                {
                    DATABASE_PACKAGES[pkg]["name"]
                    for pkg in all_packages
                    if pkg in DATABASE_PACKAGES
                }
            ),
            authentication=sorted(
                pkg for pkg in all_packages if pkg in AUTH_PACKAGES or pkg in {p.lower() for p in AUTH_PACKAGES}
            ),
            api=sorted(
                pkg for pkg in all_packages if pkg in API_PACKAGES or pkg in {p.lower() for p in API_PACKAGES}
            ),
            testing=sorted(
                pkg for pkg in all_packages if pkg in TEST_PACKAGES or pkg in {p.lower() for p in TEST_PACKAGES}
            ),
            build_tools=sorted(
                pkg
                for pkg in all_packages
                if pkg in BUILD_TOOL_PACKAGES or pkg in {p.lower() for p in BUILD_TOOL_PACKAGES}
            ),
        )

        result.dependencies = DependenciesInfo(
            production=sorted(production),
            development=sorted(development),
            categories=categories,
            source_files=sorted(set(source_files)),
        )


def _match_framework_packages(package_names: set[str]) -> list[str]:
    frameworks: set[str] = set()
    for framework_name, rule in FRAMEWORK_RULES.items():
        packages = {str(pkg).lower() for pkg in rule["packages"]}
        if packages & package_names:
            frameworks.add(framework_name)
    return sorted(frameworks)
