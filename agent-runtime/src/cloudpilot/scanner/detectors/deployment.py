"""Deployment file detection."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.knowledge import DEPLOYMENT_FILE_MAP
from cloudpilot.scanner.models import DeploymentFile, DeploymentInfo, ScanResult


class DeploymentDetector:
    """Detect deployment-related files and platforms."""

    name = "deployment"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        files: list[DeploymentFile] = []
        platforms: set[str] = set()

        for file_path in context.files:
            lowered = file_path.name.lower()
            if lowered == "dockerfile":
                files.append(DeploymentFile(path=file_path.as_posix(), type="docker"))
                platforms.add("docker")
                continue

            deployment_type = DEPLOYMENT_FILE_MAP.get(lowered)
            if deployment_type:
                files.append(DeploymentFile(path=file_path.as_posix(), type=deployment_type))
                platforms.add(deployment_type)

        result.deployment = DeploymentInfo(
            files=sorted(files, key=lambda item: item.path),
            detected_platforms=sorted(platforms),
        )
