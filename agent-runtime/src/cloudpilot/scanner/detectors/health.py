"""Deployment readiness facts."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import HealthInfo, HealthIssue, ScanResult


class HealthDetector:
    """Report factual deployment readiness observations."""

    name = "health"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        has_env_template = bool(result.environment.template_files)
        has_build_command = bool(result.commands.build)
        has_start_command = bool(result.commands.start)
        has_deployment_files = bool(result.deployment.files)
        has_lock_file = bool(result.packageManager.lock_files)
        has_dockerfile = any(item.type == "docker" for item in result.deployment.files)

        issues: list[HealthIssue] = []
        if not has_env_template:
            issues.append(
                HealthIssue(
                    code="missing_env_template",
                    message="No .env.example, .env.sample, or .env.template file found.",
                )
            )
        if not has_build_command:
            issues.append(
                HealthIssue(
                    code="missing_build_command",
                    message="No build command detected in supported manifest files.",
                )
            )
        if not has_start_command:
            issues.append(
                HealthIssue(
                    code="missing_start_command",
                    message="No production start command detected in supported manifest files.",
                )
            )
        if not has_deployment_files:
            issues.append(
                HealthIssue(
                    code="missing_deployment_files",
                    message="No deployment configuration files detected.",
                )
            )
        if context.has_file("package.json") and not has_lock_file:
            issues.append(
                HealthIssue(
                    code="missing_lock_file",
                    message="package.json present but no npm/yarn/pnpm/bun lock file found.",
                )
            )
        if not has_dockerfile:
            issues.append(
                HealthIssue(
                    code="missing_dockerfile",
                    message="No Dockerfile detected.",
                )
            )

        result.health = HealthInfo(
            issues=issues,
            has_env_template=has_env_template,
            has_build_command=has_build_command,
            has_start_command=has_start_command,
            has_deployment_files=has_deployment_files,
            has_lock_file=has_lock_file,
            has_dockerfile=has_dockerfile,
        )
