"""Blueprint and repository validation for deployments."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from cloudpilot.agents.architecture.models import DeployableService, DeploymentBlueprint
from cloudpilot.agents.deployment.models import MissingInput, ValidationIssue
from cloudpilot.agents.deployment.providers.factory import (
    credential_key_for_platform,
    get_provider,
    list_supported_platforms,
)
from cloudpilot.agents.repository_analysis.utils.source_resolver import parse_github_url

logger = logging.getLogger(__name__)

_FRONTEND_TYPES = {"frontend", "static", "spa", "web", "ui"}
_VERCEL_RUNTIMES = {"node", "nodejs", "nextjs", "react", "vite", "static"}
_RENDER_RUNTIMES = {"node", "nodejs", "python", "docker", "ruby", "go"}


class BlueprintValidator:
    """Deterministic validation before deployment."""

    def validate(
        self,
        *,
        blueprint: DeploymentBlueprint,
        repository_analysis: dict[str, Any],
        source_url: str,
        branch: str | None,
        credentials: dict[str, str],
        env_vars: dict[str, str],
        github_token: str | None,
    ) -> tuple[list[ValidationIssue], list[MissingInput], str]:
        issues: list[ValidationIssue] = []
        missing: list[MissingInput] = []

        if not blueprint.deployable_services:
            issues.append(
                ValidationIssue(
                    code="no_services",
                    message="Deployment blueprint contains no deployable services.",
                ),
            )

        service_ids = {service.id for service in blueprint.deployable_services}
        for step in blueprint.deployment_sequence:
            if step.service_id and step.service_id not in service_ids:
                issues.append(
                    ValidationIssue(
                        code="invalid_sequence",
                        message=f"Deployment sequence references unknown service '{step.service_id}'.",
                    ),
                )

        platforms_needed: set[str] = set()
        for service in blueprint.deployable_services:
            platform = (service.platform or "").strip().lower()
            if not platform:
                issues.append(
                    ValidationIssue(
                        code="missing_platform",
                        message=f"Service '{service.id}' has no platform assigned.",
                        service_id=service.id,
                    ),
                )
                continue
            platforms_needed.add(platform)
            if platform not in list_supported_platforms():
                issues.append(
                    ValidationIssue(
                        code="unsupported_platform",
                        message=(
                            f"Platform '{platform}' is not supported yet. "
                            f"Supported: {', '.join(list_supported_platforms())}."
                        ),
                        service_id=service.id,
                    ),
                )
                continue
            issues.extend(self._validate_service_config(service, repository_analysis))

        for platform in platforms_needed:
            cred_key = credential_key_for_platform(platform)
            if cred_key and not credentials.get(cred_key, "").strip():
                missing.append(
                    MissingInput(
                        kind="credential",
                        name=cred_key,
                        description=f"API credentials required for {platform.title()}.",
                        platform=platform,
                    ),
                )

        required_env = self._collect_required_env(blueprint)
        for var in sorted(required_env):
            if not env_vars.get(var, "").strip():
                missing.append(
                    MissingInput(
                        kind="env_var",
                        name=var,
                        description=f"Environment variable '{var}' is required for deployment.",
                    ),
                )

        parsed = parse_github_url(source_url)
        if not parsed or not parsed.owner or not parsed.repo:
            issues.append(
                ValidationIssue(
                    code="invalid_repo_url",
                    message="Only GitHub repository URLs are supported for deployment.",
                ),
            )
            resolved_branch = branch or "main"
        else:
            default_branch = (
                branch
                or repository_analysis.get("source", {}).get("default_branch")
                or "main"
            )
            resolved_branch = branch or default_branch
            if not branch and not repository_analysis.get("source", {}).get("default_branch"):
                missing.append(
                    MissingInput(
                        kind="branch",
                        name="branch",
                        description=f"Deployment branch (default: {default_branch}).",
                    ),
                )

            if github_token:
                repo_issues = asyncio.run(
                    self._validate_github_access(
                        parsed.owner,
                        parsed.repo,
                        resolved_branch,
                        github_token,
                        platforms_needed,
                    ),
                )
                issues.extend(repo_issues)
            elif not any(issue.code == "invalid_repo_url" for issue in issues):
                issues.append(
                    ValidationIssue(
                        code="github_required",
                        message="GitHub connection is required to validate repository access.",
                    ),
                )

        blocking = [issue for issue in issues if issue.severity == "error"]
        return blocking, missing, resolved_branch

    def _validate_service_config(
        self,
        service: DeployableService,
        repository_analysis: dict[str, Any],
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        service_type = self._infer_service_type(service, repository_analysis)
        platform = (service.platform or "").lower()

        if not service.build_command and service_type not in _FRONTEND_TYPES:
            issues.append(
                ValidationIssue(
                    code="missing_build_command",
                    message=f"Service '{service.id}' is missing a build command.",
                    service_id=service.id,
                ),
            )

        if platform == "render" and not service.start_command and service_type not in _FRONTEND_TYPES:
            issues.append(
                ValidationIssue(
                    code="missing_start_command",
                    message=f"Service '{service.id}' requires a start command on Render.",
                    service_id=service.id,
                    severity="warning",
                ),
            )

        if platform == "vercel" and service_type in _FRONTEND_TYPES and not service.output_directory:
            scan = repository_analysis.get("facts", {})
            frameworks = scan.get("frameworks", {})
            if frameworks.get("frontend") and "next" not in str(frameworks.get("frontend", "")).lower():
                issues.append(
                    ValidationIssue(
                        code="missing_output_directory",
                        message=f"Service '{service.id}' may need an output directory for Vercel static builds.",
                        service_id=service.id,
                        severity="warning",
                    ),
                )

        runtime = (service.runtime_version or "").lower()
        if platform == "vercel" and runtime and not any(r in runtime for r in _VERCEL_RUNTIMES):
            issues.append(
                ValidationIssue(
                    code="invalid_runtime",
                    message=f"Runtime '{service.runtime_version}' may not be supported on Vercel.",
                    service_id=service.id,
                    severity="warning",
                ),
            )
        if platform == "render" and runtime and not any(r in runtime for r in _RENDER_RUNTIMES):
            issues.append(
                ValidationIssue(
                    code="invalid_runtime",
                    message=f"Runtime '{service.runtime_version}' may not be supported on Render.",
                    service_id=service.id,
                    severity="warning",
                ),
            )

        if not self._required_files_present(service, repository_analysis):
            issues.append(
                ValidationIssue(
                    code="missing_required_files",
                    message=f"Required project files may be missing for service '{service.id}'.",
                    service_id=service.id,
                    severity="warning",
                ),
            )

        return issues

    def _infer_service_type(
        self,
        service: DeployableService,
        repository_analysis: dict[str, Any],
    ) -> str:
        inventory = repository_analysis.get("facts", {}).get("architecture", {})
        for item in inventory.get("types", []):
            if service.id in str(item).lower():
                return str(item).lower()
        name = (service.name or service.id).lower()
        if any(token in name for token in _FRONTEND_TYPES):
            return "frontend"
        return "backend"

    def _required_files_present(
        self,
        service: DeployableService,
        repository_analysis: dict[str, Any],
    ) -> bool:
        deployment_files = repository_analysis.get("facts", {}).get("deployment", {}).get("files", [])
        known_paths = {item.get("path", "") for item in deployment_files if isinstance(item, dict)}
        root = service.root_directory or "."
        candidates = [
            f"{root}/package.json".replace("./", ""),
            "package.json",
            f"{root}/requirements.txt".replace("./", ""),
            "requirements.txt",
            f"{root}/Dockerfile".replace("./", ""),
            "Dockerfile",
        ]
        if known_paths:
            return any(path in known_paths or path.lstrip("./") in known_paths for path in candidates)
        health = repository_analysis.get("facts", {}).get("health", {})
        return bool(health.get("has_build_command") or health.get("has_deployment_files"))

    def _collect_required_env(self, blueprint: DeploymentBlueprint) -> set[str]:
        required: set[str] = set()
        for service in blueprint.deployable_services:
            required.update(service.environment_variables)
            required.update(service.required_secrets)
        for item in blueprint.environment_plan:
            required.add(item.variable)
        return {var.strip() for var in required if var.strip()}

    async def _validate_github_access(
        self,
        owner: str,
        repo: str,
        branch: str,
        github_token: str,
        platforms: set[str],
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for platform in platforms:
            if platform not in list_supported_platforms():
                continue
            try:
                provider = get_provider(platform)
                check = await provider.validate_repo_access(owner, repo, branch, github_token)
                if not check.accessible:
                    issues.append(
                        ValidationIssue(
                            code="repo_inaccessible",
                            message=check.message,
                        ),
                    )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Repo validation failed for %s: %s", platform, exc)
                issues.append(
                    ValidationIssue(
                        code="repo_validation_error",
                        message=str(exc),
                    ),
                )
        return issues

    async def validate_credentials_async(
        self,
        platforms: set[str],
        credentials: dict[str, str],
    ) -> list[ValidationIssue]:
        issues: list[ValidationIssue] = []
        for platform in platforms:
            if platform not in list_supported_platforms():
                continue
            try:
                provider = get_provider(platform)
                check = await provider.validate_credentials(credentials)
                if not check.valid:
                    issues.append(
                        ValidationIssue(
                            code="invalid_credentials",
                            message=f"{platform.title()}: {check.message}",
                        ),
                    )
            except Exception as exc:  # noqa: BLE001
                issues.append(
                    ValidationIssue(
                        code="credential_check_error",
                        message=f"{platform.title()}: {exc}",
                    ),
                )
        return issues
