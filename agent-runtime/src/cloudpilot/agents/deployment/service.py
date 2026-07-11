"""Production Deployment Agent service."""

from __future__ import annotations

import asyncio
import logging

from cloudpilot.agents.deployment.errors import PlatformApiError
from cloudpilot.agents.deployment.failure_analysis import FailureAnalysisService
from cloudpilot.agents.deployment.models import (
    DeploymentRequest,
    DeploymentResult,
    DeploymentState,
    MissingInput,
)
from cloudpilot.agents.deployment.phases import PhaseContext
from cloudpilot.agents.deployment.pipeline import DeploymentPipeline
from cloudpilot.agents.deployment.security import mask_env_vars
from cloudpilot.agents.deployment.summary import SummaryGenerator
from cloudpilot.agents.deployment.validator import BlueprintValidator
from cloudpilot.config import configure_runtime

logger = logging.getLogger(__name__)


class DeploymentService:
    """Orchestrate validation, confirmation, execution, monitoring, and reporting."""

    def __init__(self) -> None:
        configure_runtime()
        self._validator = BlueprintValidator()
        self._summary = SummaryGenerator()
        self._pipeline = DeploymentPipeline()
        self._failure = FailureAnalysisService()

    def run(self, request: DeploymentRequest) -> DeploymentResult:
        action = request.action
        blueprint = request.resolved_blueprint()
        state = request.resolved_state()

        credentials = {
            "vercel_token": (request.credentials.vercel_token or "").strip(),
            "render_api_key": (request.credentials.render_api_key or "").strip(),
        }
        env_vars = {**state.env_vars, **request.env_vars}
        state.env_vars = env_vars

        if request.branch:
            state.branch = request.branch

        if action in {"prepare", "provide_inputs", "retry"}:
            return self._prepare(
                request=request,
                blueprint=blueprint,
                state=state,
                credentials=credentials,
                env_vars=env_vars,
            )

        if action == "execute":
            return self._execute(
                request=request,
                blueprint=blueprint,
                state=state,
                credentials=credentials,
                env_vars=env_vars,
            )

        if action == "poll":
            return self._poll(
                request=request,
                blueprint=blueprint,
                state=state,
                credentials=credentials,
                env_vars=env_vars,
            )

        if action == "analyze_failure":
            return self._analyze_failure(
                request=request,
                blueprint=blueprint,
                state=state,
            )

        return DeploymentResult(
            status="preparing",
            message=f"Unsupported deployment action: {action}",
        )

    def _prepare(
        self,
        *,
        request: DeploymentRequest,
        blueprint,
        state: DeploymentState,
        credentials: dict[str, str],
        env_vars: dict[str, str],
    ) -> DeploymentResult:
        branch = request.branch or state.branch
        issues, missing, resolved_branch = self._validator.validate(
            blueprint=blueprint,
            repository_analysis=request.repository_analysis,
            source_url=request.source_url,
            branch=branch,
            credentials=credentials,
            env_vars=env_vars,
            github_token=request.github_token,
        )
        state.branch = resolved_branch

        platforms = {(service.platform or "").lower() for service in blueprint.deployable_services}
        cred_issues = asyncio.run(
            self._validator.validate_credentials_async(platforms, credentials),
        )
        issues.extend(cred_issues)

        auth_diagnostics = self._pipeline.run_authentication_sync(platforms, credentials)

        blocking = [issue for issue in issues if issue.severity == "error"]

        filtered_missing = [
            item
            for item in missing
            if not (item.kind == "branch" and (request.branch or state.branch))
        ]
        if request.branch:
            filtered_missing = [item for item in filtered_missing if item.kind != "branch"]

        if blocking:
            return DeploymentResult(
                status="needs_input" if filtered_missing else "preparing",
                validation_issues=issues,
                missing_inputs=filtered_missing,
                deployment_state=state,
                diagnostics=auth_diagnostics,
                message="Resolve validation issues before deployment.",
            )

        if auth_diagnostics:
            return DeploymentResult(
                status="needs_input",
                missing_inputs=filtered_missing,
                deployment_state=state,
                diagnostics=auth_diagnostics,
                message=auth_diagnostics[0].message,
            )

        if filtered_missing:
            return DeploymentResult(
                status="needs_input",
                missing_inputs=filtered_missing,
                deployment_state=state,
                message="Additional inputs are required before deployment.",
            )

        summary = self._summary.generate(
            blueprint=blueprint,
            source_url=request.source_url,
            branch=state.branch,
        )
        masked_state = DeploymentState(
            branch=state.branch,
            env_vars=mask_env_vars(state.env_vars),
            services=state.services,
            current_service_index=state.current_service_index,
        )
        return DeploymentResult(
            status="awaiting_confirmation",
            deployment_summary=summary,
            deployment_state=masked_state,
            validation_issues=[issue for issue in issues if issue.severity == "warning"],
            message="Review the deployment summary and confirm to proceed.",
        )

    def _execute(
        self,
        *,
        request: DeploymentRequest,
        blueprint,
        state: DeploymentState,
        credentials: dict[str, str],
        env_vars: dict[str, str],
    ) -> DeploymentResult:
        if not request.confirmed:
            return DeploymentResult(
                status="awaiting_confirmation",
                message="Deployment requires explicit user confirmation.",
            )

        BlueprintValidator.normalize_blueprint(blueprint)

        platforms = {(service.platform or "").lower() for service in blueprint.deployable_services}
        auth_diagnostics = self._pipeline.run_authentication_sync(platforms, credentials)
        if auth_diagnostics:
            return DeploymentResult(
                status="needs_input",
                diagnostics=auth_diagnostics,
                deployment_state=state,
                message=auth_diagnostics[0].message,
            )

        missing_creds: list[MissingInput] = []
        required_keys = {"vercel": "vercel_token", "render": "render_api_key"}
        for platform in platforms:
            cred_key = required_keys.get(platform)
            if cred_key and not credentials.get(cred_key):
                missing_creds.append(
                    MissingInput(
                        kind="credential",
                        name=cred_key,
                        description=f"API credentials required for {platform}.",
                        platform=platform,
                    ),
                )

        if missing_creds:
            return DeploymentResult(
                status="needs_input",
                missing_inputs=missing_creds,
                deployment_state=state,
                message="Provide platform credentials before executing deployment.",
            )

        ctx = PhaseContext(
            blueprint=blueprint,
            source_url=request.source_url,
            branch=state.branch,
            credentials=credentials,
            github_token=request.github_token,
            env_vars=env_vars,
            state=state,
            ordered_service_ids=self._pipeline.ordered_service_ids(blueprint),
        )

        try:
            state, progress, diagnostics = self._pipeline.run_execute_sync(ctx)
        except PlatformApiError as exc:
            logger.exception("Deployment execution failed")
            return DeploymentResult(
                status="failed",
                deployment_state=state,
                diagnostics=[exc.to_diagnostic()],
                message=str(exc),
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Deployment execution failed")
            return DeploymentResult(
                status="failed",
                deployment_state=state,
                message=str(exc),
            )

        if diagnostics and progress.overall_status == "failed":
            return DeploymentResult(
                status="failed",
                deployment_state=state,
                progress=progress,
                diagnostics=diagnostics,
                message=diagnostics[0].message,
            )

        return DeploymentResult(
            status="deploying",
            deployment_state=state,
            progress=progress,
            diagnostics=diagnostics,
            message="Deployment started. Poll for progress updates.",
        )

    def _poll(
        self,
        *,
        request: DeploymentRequest,
        blueprint,
        state: DeploymentState,
        credentials: dict[str, str],
        env_vars: dict[str, str],
    ) -> DeploymentResult:
        BlueprintValidator.normalize_blueprint(blueprint)
        secrets = [value for value in env_vars.values() if value]
        secrets.extend(value for value in credentials.values() if value)

        ctx = PhaseContext(
            blueprint=blueprint,
            source_url=request.source_url,
            branch=state.branch,
            credentials=credentials,
            github_token=request.github_token,
            env_vars=env_vars,
            state=state,
            ordered_service_ids=self._pipeline.ordered_service_ids(blueprint),
            secrets_for_redaction=secrets,
        )

        state, progress, report, diagnostics = self._pipeline.run_monitoring_sync(ctx)

        if report:
            return DeploymentResult(
                status="complete",
                deployment_state=state,
                progress=progress,
                report=report,
                message="Deployment completed successfully.",
            )

        if progress.overall_status == "failed":
            failing = next(
                (service for service in state.services if service.error),
                None,
            )
            message = failing.error if failing and failing.error else "Deployment failed."
            if diagnostics:
                message = diagnostics[0].message
            return DeploymentResult(
                status="failed",
                deployment_state=state,
                progress=progress,
                diagnostics=diagnostics,
                message=message,
            )

        return DeploymentResult(
            status="deploying",
            deployment_state=state,
            progress=progress,
            diagnostics=diagnostics,
            message="Deployment in progress.",
        )

    def _analyze_failure(
        self,
        *,
        request: DeploymentRequest,
        blueprint,
        state: DeploymentState,
    ) -> DeploymentResult:
        failing = next(
            (service for service in state.services if service.error or service.deploy_status == "failed"),
            None,
        )
        if not failing:
            return DeploymentResult(
                status="failed",
                deployment_state=state,
                message="No failed service found to analyze.",
            )

        analysis = self._failure.analyze(
            platform=failing.platform,
            error_message=failing.error or "Deployment failed.",
            logs=failing.logs_excerpt,
            repository_analysis=request.repository_analysis,
            failing_stage=state.failing_stage,
            service=failing,
        )

        return DeploymentResult(
            status="failed",
            deployment_state=state,
            failure_analysis=analysis,
            message="Failure analysis complete. Resolve issues and retry when ready.",
        )
