"""Architecture and project structure detection."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.knowledge import STRUCTURE_FOLDERS
from cloudpilot.scanner.models import ArchitectureInfo, ProjectStructure, ScanResult


class ArchitectureDetector:
    """Classify project architecture from frameworks and folders."""

    name = "architecture"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        folders = _detect_structure_folders(context)
        types = _classify_architecture(result, folders)

        result.architecture = ArchitectureInfo(
            primary=types[0] if types else None,
            types=types,
            structure=ProjectStructure(folders=folders),
        )


def _detect_structure_folders(context: ScanContext) -> list[str]:
    found: set[str] = set()
    for folder in STRUCTURE_FOLDERS:
        if (context.root / folder).is_dir():
            found.add(folder)
        if any(path.parts and path.parts[0] == folder for path in context.directories):
            found.add(folder)
    return sorted(found)


def _classify_architecture(result: ScanResult, folders: list[str]) -> list[str]:
    types: list[str] = []
    frontend = bool(result.frameworks.frontend)
    backend = bool(result.frameworks.backend)

    if result.repository.is_monorepo:
        types.append("monorepo")
    if frontend and backend:
        types.append("full_stack")
    elif frontend:
        types.append("frontend_only")
    elif backend:
        types.append("backend_only")

    if "api" in folders or any(name in result.frameworks.backend for name in ("express", "fastify", "nestjs", "django", "flask")):
        if "api_server" not in types:
            types.append("api_server")
    if "public" in folders and frontend and not backend:
        types.append("static_website")
    if len(result.deployment.files) > 1 or result.repository.is_monorepo:
        if "microservices" not in types and result.repository.is_monorepo:
            types.append("microservices")

    return types
