"""Deployment execution against platform providers."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from cloudpilot.agents.architecture.models import DeployableService, DeploymentBlueprint
from cloudpilot.agents.deployment.models import (
    DeployableServiceState,
    DeploymentProgress,
    DeploymentReport,
    DeploymentState,
)
from cloudpilot.agents.deployment.providers.base import DeployContext
from cloudpilot.agents.deployment.providers.factory import get_provider
from cloudpilot.agents.deployment.security import redact_logs
from cloudpilot.agents.repository_analysis.utils.source_resolver import parse_github_url

logger = logging.getLogger(__name__)


class DeploymentExecutor:
    """Execute and monitor deployments via registered providers."""

    async def execute(
        self,
        *,
        blueprint: DeploymentBlueprint,
        source_url: str,
        branch: str,
        credentials: dict[str, str],
        github_token: str | None,
        env_vars: dict[str, str],
        state: DeploymentState,
    ) -> tuple[DeploymentState, DeploymentProgress]:
        parsed = parse_github_url(source_url)
        if not parsed or not parsed.owner or not parsed.repo:
            raise ValueError("Invalid GitHub repository URL.")

        service_map = {service.id: service for service in blueprint.deployable_services}
        if not state.services:
            state.services = [
                DeployableServiceState(
                    service_id=service.id,
                    name=service.name or service.id,
                    platform=service.platform,
                    health_check_path=service.health_check_path,
                )
                for service in blueprint.deployable_services
            ]

        if not state.started_at:
            state.started_at = datetime.now(timezone.utc).isoformat()

        sequence = sorted(blueprint.deployment_sequence, key=lambda step: step.order)
        ordered_ids = [step.service_id for step in sequence if step.service_id]
        if not ordered_ids:
            ordered_ids = [service.id for service in blueprint.deployable_services]

        ctx_base = DeployContext(
            owner=parsed.owner,
            repo=parsed.repo,
            branch=branch,
            source_url=source_url,
            github_token=github_token,
            credentials=credentials,
            env_vars=env_vars,
        )

        for service_id in ordered_ids:
            service = service_map.get(service_id)
            if not service:
                continue
            service_state = next(item for item in state.services if item.service_id == service_id)
            if service_state.provider_job_id and service_state.deploy_status == "live":
                continue

            provider = get_provider(service.platform)
            service_env = self._env_for_service(service, env_vars, blueprint)
            ctx = DeployContext(
                owner=ctx_base.owner,
                repo=ctx_base.repo,
                branch=ctx_base.branch,
                source_url=ctx_base.source_url,
                github_token=ctx_base.github_token,
                credentials=ctx_base.credentials,
                env_vars=service_env,
            )

            service_state.stage = "provisioning"
            resource = await provider.ensure_service(service, ctx)
            service_state.provider_resource_id = resource.resource_id

            if service_env:
                service_state.stage = "configuring"
                await provider.set_environment_variables(resource.resource_id, service_env, credentials)

            service_state.stage = "deploying"
            job = await provider.trigger_deploy(resource.resource_id, service, ctx)
            service_state.provider_job_id = job.job_id
            service_state.deploy_status = "deploying"
            service_state.build_status = "building"
            if job.url:
                service_state.url = job.url

        progress = self._build_progress(state, current_stage="deploying")
        return state, progress

    async def poll(
        self,
        *,
        blueprint: DeploymentBlueprint,
        credentials: dict[str, str],
        state: DeploymentState,
        secrets_for_redaction: list[str] | None = None,
    ) -> tuple[DeploymentState, DeploymentProgress, DeploymentReport | None]:
        any_failed = False
        all_ready = True
        failing_service: DeployableServiceState | None = None

        for service_state in state.services:
            if not service_state.provider_job_id or not service_state.provider_resource_id:
                all_ready = False
                continue

            provider = get_provider(service_state.platform)
            status = await provider.get_status(
                service_state.provider_job_id,
                service_state.provider_resource_id,
                credentials,
            )
            service_state.stage = status.stage
            service_state.build_status = status.build_status
            service_state.deploy_status = status.deploy_status
            if status.url:
                service_state.url = status.url
            if status.error:
                service_state.error = status.error

            if status.failed:
                any_failed = True
                failing_service = service_state
                logs = await provider.fetch_logs(
                    service_state.provider_job_id,
                    service_state.provider_resource_id,
                    credentials,
                )
                service_state.logs_excerpt = redact_logs(logs, secrets_for_redaction)
            elif not status.ready:
                all_ready = False
            else:
                logs = await provider.fetch_logs(
                    service_state.provider_job_id,
                    service_state.provider_resource_id,
                    credentials,
                    tail=50,
                )
                service_state.logs_excerpt = redact_logs(logs, secrets_for_redaction)

        if any_failed:
            state.failing_service_id = failing_service.service_id if failing_service else None
            state.failing_stage = failing_service.stage if failing_service else None
            progress = self._build_progress(state, current_stage="failed", overall_status="failed")
            return state, progress, None

        if all_ready and state.services:
            state.completed_at = datetime.now(timezone.utc).isoformat()
            report = self._build_report(state, blueprint, success=True)
            progress = self._build_progress(state, current_stage="complete", overall_status="complete")
            return state, progress, report

        progress = self._build_progress(state, current_stage="deploying", overall_status="deploying")
        return state, progress, None

    def _env_for_service(
        self,
        service: DeployableService,
        env_vars: dict[str, str],
        blueprint: DeploymentBlueprint,
    ) -> dict[str, str]:
        allowed = set(service.environment_variables) | set(service.required_secrets)
        for item in blueprint.environment_plan:
            if not item.service_ids or service.id in item.service_ids:
                allowed.add(item.variable)
        return {key: value for key, value in env_vars.items() if key in allowed}

    def _build_progress(
        self,
        state: DeploymentState,
        *,
        current_stage: str,
        overall_status: str = "deploying",
    ) -> DeploymentProgress:
        return DeploymentProgress(
            current_stage=current_stage,
            overall_status=overall_status,
            services=state.services,
            started_at=state.started_at,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )

    def _build_report(
        self,
        state: DeploymentState,
        blueprint: DeploymentBlueprint,
        *,
        success: bool,
    ) -> DeploymentReport:
        duration = None
        if state.started_at and state.completed_at:
            started = datetime.fromisoformat(state.started_at)
            completed = datetime.fromisoformat(state.completed_at)
            duration = (completed - started).total_seconds()

        urls = [service.url for service in state.services if service.url]
        platforms = sorted({service.platform for service in state.services})
        warnings = [risk.recommendation for risk in blueprint.architectural_risks if risk.recommendation][:5]

        return DeploymentReport(
            status="success" if success else "failed",
            deployment_urls=urls,
            platforms_used=platforms,
            duration_seconds=duration,
            build_summary=f"Deployed {len(state.services)} service(s) across {', '.join(platforms)}.",
            warnings=warnings,
            errors=[],
            logs="\n\n".join(
                f"[{service.service_id}]\n{service.logs_excerpt}"
                for service in state.services
                if service.logs_excerpt
            ),
            recommendations=[
                "Monitor application health at the deployed URLs.",
            ],
            next_steps=[
                "Verify health check endpoints respond successfully.",
                "Configure custom domains if needed.",
                "Set up monitoring in a future CloudPilot release.",
            ],
            services=state.services,
        )

    def run_execute(self, **kwargs) -> tuple[DeploymentState, DeploymentProgress]:
        return asyncio.run(self.execute(**kwargs))

    def run_poll(self, **kwargs) -> tuple[DeploymentState, DeploymentProgress, DeploymentReport | None]:
        return asyncio.run(self.poll(**kwargs))
