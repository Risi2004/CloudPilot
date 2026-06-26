"""Database detection."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.knowledge import DATABASE_PACKAGES
from cloudpilot.scanner.models import DatabaseEntry, DatabaseInfo, ScanResult


class DatabaseDetector:
    """Detect databases, ORMs, caches, and BaaS libraries."""

    name = "database"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        package_names = {
            name.lower()
            for name in result.dependencies.production + result.dependencies.development
        }
        detected: dict[str, DatabaseEntry] = {}

        for package, meta in DATABASE_PACKAGES.items():
            if package in package_names:
                entry = detected.setdefault(
                    meta["name"],
                    DatabaseEntry(
                        name=meta["name"],
                        category=meta["category"],  # type: ignore[arg-type]
                        evidence=[],
                    ),
                )
                entry.evidence.append(f"dependency:{package}")

        for rel_path in context.files:
            if rel_path.name == "schema.prisma":
                _add_file_evidence(detected, "Prisma", "orm", rel_path.as_posix())

        result.database = DatabaseInfo(detected=sorted(detected.values(), key=lambda item: item.name))


def _add_file_evidence(
    detected: dict[str, DatabaseEntry],
    name: str,
    category: str,
    file_path: str,
) -> None:
    entry = detected.setdefault(
        name,
        DatabaseEntry(name=name, category=category, evidence=[]),  # type: ignore[arg-type]
    )
    evidence = f"file:{file_path}"
    if evidence not in entry.evidence:
        entry.evidence.append(evidence)
