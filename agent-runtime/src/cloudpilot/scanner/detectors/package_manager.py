"""Package manager detection."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.knowledge import LOCK_FILE_MANAGERS
from cloudpilot.scanner.models import PackageManagerInfo, ScanResult


class PackageManagerDetector:
    """Detect package managers from lockfiles and tooling manifests."""

    name = "package_manager"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        managers: list[str] = []
        lock_files: list[str] = []

        for file_path in context.files:
            manager = LOCK_FILE_MANAGERS.get(file_path.name.lower())
            if manager:
                lock_files.append(file_path.as_posix())
                if manager not in managers:
                    managers.append(manager)

        if context.has_file("pnpm-workspace.yaml") and "pnpm" not in managers:
            managers.append("pnpm")
        if context.has_file("poetry.lock") and "poetry" not in managers:
            managers.append("poetry")
        if context.has_file("Pipfile") and "pip" not in managers:
            managers.append("pip")
        if context.has_file("uv.lock") and "uv" not in managers:
            managers.append("uv")

        primary = managers[0] if managers else None
        result.packageManager = PackageManagerInfo(
            primary=primary,
            managers=managers,
            lock_files=sorted(lock_files),
        )
