"""Phase-based deployment pipeline orchestrator."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone

from cloudpilot.agents.architecture.models import DeployableService, DeploymentBlueprint
from cloudpilot.agents.deployment.errors import PlatformApiError, diagnostic_from_code
from cloudpilot.agents.deployment.models import (
    DeployableServiceState,
    DeploymentDiagnostic,
    DeploymentProgress,
    DeploymentReport,
    DeploymentState,
)
from cloudpilot.agents.deployment.phases import DeploymentPhase, PhaseContext
from cloudpilot.agents.deployment.providers.base import DeployContext
from cloudpilot.agents.deployment.providers.factory import get_provider, list_supported_platforms
from cloudpilot.agents.deployment.security import redact_logs
from cloudpilot.agents.deployment.validator import BlueprintValidator
from cloudpilot.agents.repository_analysis.utils.source_resolver import parse_github_url
from cloudpilot.scanner.utils.env_classifier import classify_env_variable, resolve_auto_value

logger = logging.getLogger(__name__)


class DeploymentPipeline:
    """Orchestrate validation, execution, monitoring, and reporting phases."""

    def __init__(self) -> None:
        self._validator = BlueprintValidator()

    def ordered_service_ids(self, blueprint: DeploymentBlueprint) -> list[str]:
        deployable_ids = [service.id for service in blueprint.deployable_services]
        deployable_set = set(deployable_ids)
        sequence = sorted(blueprint.deployment_sequence, key=lambda step: step.order)
        ordered_ids = [
            step.service_id
            for step in sequence
            if step.service_id and step.service_id in deployable_set
        ]
        # Include deployable services the LLM omitted from the sequence.
        for service_id in deployable_ids:
            if service_id not in ordered_ids:
                ordered_ids.append(service_id)
        return ordered_ids or deployable_ids

    def ensure_service_states(self, state: DeploymentState, blueprint: DeploymentBlueprint) -> None:
        if state.services:
            return
        state.services = [
            DeployableServiceState(
                service_id=service.id,
                name=service.name or service.id,
                platform=service.platform,
                health_check_path=service.health_check_path,
            )
            for service in blueprint.deployable_services
        ]

    @staticmethod
    def _reset_stalled_index(state: DeploymentState, ordered_ids: list[str]) -> None:
        """If every service is still pending, rewind index so deploy can start."""
        if not state.services:
            return
        all_pending = all(
            (not service.provider_job_id and service.deploy_status in {"pending", "failed"})
            for service in state.services
        )
        if all_pending:
            state.current_service_index = 0
            return
        if ordered_ids and state.current_service_index >= len(ordered_ids):
            # Index advanced past unknown sequence entries; resume at first undeployed.
            for index, service_id in enumerate(ordered_ids):
                service_state = next(
                    (item for item in state.services if item.service_id == service_id),
                    None,
                )
                if service_state and not service_state.provider_job_id:
                    state.current_service_index = index
                    return

    async def run_authentication(
        self,
        platforms: set[str],
        credentials: dict[str, str],
    ) -> list[DeploymentDiagnostic]:
        diagnostics: list[DeploymentDiagnostic] = []
        issues = await self._validator.validate_credentials_async(platforms, credentials)
        for issue in issues:
            diagnostics.append(
                diagnostic_from_code(
                    "invalid_credentials",
                    issue.message,
                    phase=DeploymentPhase.AUTHENTICATION,
                    platform=issue.message.split(":")[0].lower() if ":" in issue.message else None,
                ),
            )
        return diagnostics

    async def run_execute(self, ctx: PhaseContext) -> tuple[DeploymentState, DeploymentProgress, list[DeploymentDiagnostic]]:
        diagnostics: list[DeploymentDiagnostic] = []
        BlueprintValidator.normalize_blueprint(ctx.blueprint)
        parsed = parse_github_url(ctx.source_url)
        if not parsed or not parsed.owner or not parsed.repo:
            diagnostics.append(
                diagnostic_from_code(
                    "invalid_repo_url",
                    "Invalid GitHub repository URL.",
                    phase=DeploymentPhase.VALIDATION,
                ),
            )
            progress = self._build_progress(ctx.state, current_stage="failed", overall_status="failed")
            return ctx.state, progress, diagnostics

        self.ensure_service_states(ctx.state, ctx.blueprint)
        if not ctx.state.started_at:
            ctx.state.started_at = datetime.now(timezone.utc).isoformat()

        ordered_ids = self.ordered_service_ids(ctx.blueprint)
        ctx.ordered_service_ids = ordered_ids
        self._reset_stalled_index(ctx.state, ordered_ids)
        service_map = {service.id: service for service in ctx.blueprint.deployable_services}

        ctx_base = DeployContext(
            owner=parsed.owner,
            repo=parsed.repo,
            branch=ctx.branch,
            source_url=ctx.source_url,
            github_token=ctx.github_token,
            credentials=ctx.credentials,
            env_vars=ctx.env_vars,
        )

        index = min(ctx.state.current_service_index, max(len(ordered_ids) - 1, 0)) if ordered_ids else 0
        while index < len(ordered_ids):
            service_id = ordered_ids[index]
            service = service_map.get(service_id)
            if not service:
                index += 1
                ctx.state.current_service_index = index
                continue

            service_state = next(item for item in ctx.state.services if item.service_id == service_id)
            self._reset_failed_service_for_retry(service_state)

            if service_state.deploy_status == "live" and service_state.provider_job_id:
                index += 1
                ctx.state.current_service_index = index
                continue

            if not self._dependencies_live(ordered_ids, index, ctx.state):
                diagnostics.append(
                    diagnostic_from_code(
                        "dependency_not_live",
                        f"Service '{service_id}' cannot deploy until prior services in the sequence are live.",
                        phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
                        platform=service.platform,
                        service_id=service_id,
                    ),
                )
                break

            # Skip in-flight or already-triggered jobs; failed jobs are reset above.
            if service_state.provider_job_id:
                index += 1
                ctx.state.current_service_index = index
                continue

            try:
                await self._deploy_single_service(
                    service=service,
                    service_state=service_state,
                    ctx_base=ctx_base,
                    blueprint=ctx.blueprint,
                    env_vars=ctx.env_vars,
                    state=ctx.state,
                )
            except PlatformApiError as exc:
                logger.exception("deployment_phase_failed service_id=%s", service_id)
                diagnostics.append(exc.to_diagnostic())
                service_state.error = str(exc)
                service_state.deploy_status = "failed"
                ctx.state.failing_service_id = service_id
                ctx.state.failing_stage = service_state.stage
                progress = self._build_progress(ctx.state, current_stage="failed", overall_status="failed")
                return ctx.state, progress, diagnostics

            index += 1
            ctx.state.current_service_index = index

        started_any = any(bool(service.provider_job_id) for service in ctx.state.services)
        if not started_any and ctx.state.services:
            diagnostics.append(
                diagnostic_from_code(
                    "deploy_not_started",
                    (
                        "No deployment job was started for: "
                        + ", ".join(service.service_id for service in ctx.state.services)
                        + ". The blueprint sequence did not map to deployable services."
                    ),
                    phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
                    service_id=ctx.state.services[0].service_id,
                ),
            )
            progress = self._build_progress(ctx.state, current_stage="failed", overall_status="failed")
            return ctx.state, progress, diagnostics

        progress = self._build_progress(ctx.state, current_stage="deploying")
        return ctx.state, progress, diagnostics

    async def _deploy_single_service(
        self,
        *,
        service: DeployableService,
        service_state: DeployableServiceState,
        ctx_base: DeployContext,
        blueprint: DeploymentBlueprint,
        env_vars: dict[str, str],
        state: DeploymentState,
    ) -> None:
        provider = get_provider(service.platform)
        service_env = self._env_for_service(service, env_vars, blueprint, state)
        ctx = DeployContext(
            owner=ctx_base.owner,
            repo=ctx_base.repo,
            branch=ctx_base.branch,
            source_url=ctx_base.source_url,
            github_token=ctx_base.github_token,
            credentials=ctx_base.credentials,
            env_vars=service_env,
        )

        logger.info(
            "deployment_phase_start",
            extra={"phase": DeploymentPhase.PROJECT_CREATION.value, "service_id": service.id, "platform": service.platform},
        )
        service_state.stage = "provisioning"
        started = time.perf_counter()
        resource = await provider.ensure_service(service, ctx)
        service_state.provider_resource_id = resource.resource_id
        logger.info(
            "deployment_phase_complete",
            extra={
                "phase": DeploymentPhase.PROJECT_CREATION.value,
                "service_id": service.id,
                "duration_ms": int((time.perf_counter() - started) * 1000),
            },
        )

        if service_env:
            logger.info(
                "deployment_phase_start",
                extra={"phase": DeploymentPhase.CONFIGURATION.value, "service_id": service.id, "platform": service.platform},
            )
            service_state.stage = "configuring"
            started = time.perf_counter()
            set_env = provider.set_environment_variables
            if service.platform == "vercel":
                await set_env(resource.resource_id, service_env, ctx_base.credentials, service_id=service.id)  # type: ignore[call-arg]
            elif service.platform == "render":
                await set_env(resource.resource_id, service_env, ctx_base.credentials, service_id=service.id)  # type: ignore[call-arg]
            else:
                await set_env(resource.resource_id, service_env, ctx_base.credentials)
            logger.info(
                "deployment_phase_complete",
                extra={
                    "phase": DeploymentPhase.CONFIGURATION.value,
                    "service_id": service.id,
                    "duration_ms": int((time.perf_counter() - started) * 1000),
                },
            )

        logger.info(
            "deployment_phase_start",
            extra={"phase": DeploymentPhase.DEPLOYMENT_EXECUTION.value, "service_id": service.id, "platform": service.platform},
        )
        service_state.stage = "deploying"
        started = time.perf_counter()
        job = await provider.trigger_deploy(resource.resource_id, service, ctx)
        service_state.provider_job_id = job.job_id
        service_state.deploy_status = "deploying"
        service_state.build_status = "building"
        if job.url:
            service_state.url = job.url
        logger.info(
            "deployment_phase_complete",
            extra={
                "phase": DeploymentPhase.DEPLOYMENT_EXECUTION.value,
                "service_id": service.id,
                "duration_ms": int((time.perf_counter() - started) * 1000),
            },
        )

    def _dependencies_live(self, ordered_ids: list[str], index: int, state: DeploymentState) -> bool:
        if index == 0:
            return True
        for prior_id in ordered_ids[:index]:
            prior = next((s for s in state.services if s.service_id == prior_id), None)
            if not prior or prior.deploy_status != "live":
                return False
        return True

    async def run_monitoring(
        self,
        ctx: PhaseContext,
    ) -> tuple[DeploymentState, DeploymentProgress, DeploymentReport | None, list[DeploymentDiagnostic]]:
        diagnostics: list[DeploymentDiagnostic] = []
        any_failed = False
        all_ready = True
        failing_service: DeployableServiceState | None = None
        stuck_minutes = int(os.getenv("DEPLOYMENT_POLL_STUCK_MINUTES", "0") or "0")

        BlueprintValidator.normalize_blueprint(ctx.blueprint)
        self.ensure_service_states(ctx.state, ctx.blueprint)
        ordered_ids = self.ordered_service_ids(ctx.blueprint)
        ctx.ordered_service_ids = ordered_ids
        self._reset_stalled_index(ctx.state, ordered_ids)

        for service_state in ctx.state.services:
            if not service_state.provider_resource_id:
                # Queued services stay "pending" until prior deps are live — do not fail them.
                if service_state.stage in {"provisioning", "configuring", "deploying"}:
                    diagnostics.append(
                        diagnostic_from_code(
                            "missing_provider_resource",
                            f"Service '{service_state.service_id}' was not provisioned on the platform.",
                            phase=DeploymentPhase.MONITORING,
                            platform=service_state.platform,
                            service_id=service_state.service_id,
                        ),
                    )
                    any_failed = True
                    failing_service = service_state
                all_ready = False
                continue

            if not service_state.provider_job_id:
                if service_state.stage in {"pending"}:
                    # Still queued after project create edge-case; wait for sequential deploy.
                    all_ready = False
                    continue
                diagnostics.append(
                    diagnostic_from_code(
                        "missing_provider_job",
                        f"Service '{service_state.service_id}' has no deployment job id. Execute may have been interrupted.",
                        phase=DeploymentPhase.MONITORING,
                        platform=service_state.platform,
                        service_id=service_state.service_id,
                    ),
                )
                any_failed = True
                failing_service = service_state
                all_ready = False
                continue

            provider = get_provider(service_state.platform)
            status = await provider.get_status(
                service_state.provider_job_id,
                service_state.provider_resource_id,
                ctx.credentials,
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
                    ctx.credentials,
                )
                service_state.logs_excerpt = redact_logs(logs, ctx.secrets_for_redaction)
            elif not status.ready:
                all_ready = False
                if stuck_minutes > 0 and ctx.state.started_at:
                    started = datetime.fromisoformat(ctx.state.started_at)
                    elapsed = (datetime.now(timezone.utc) - started).total_seconds() / 60
                    if elapsed > stuck_minutes:
                        diagnostics.append(
                            diagnostic_from_code(
                                "poll_stuck",
                                f"Deployment for '{service_state.service_id}' has been in progress for over {stuck_minutes} minutes.",
                                phase=DeploymentPhase.MONITORING,
                                platform=service_state.platform,
                                service_id=service_state.service_id,
                            ),
                        )
                        any_failed = True
                        failing_service = service_state
            else:
                logs = await provider.fetch_logs(
                    service_state.provider_job_id,
                    service_state.provider_resource_id,
                    ctx.credentials,
                    tail=50,
                )
                service_state.logs_excerpt = redact_logs(logs, ctx.secrets_for_redaction)

        ordered_ids = ctx.ordered_service_ids or self.ordered_service_ids(ctx.blueprint)
        if not any_failed:
            next_diagnostics = await self._maybe_deploy_next_service(ctx, ordered_ids)
            diagnostics.extend(next_diagnostics)
            for service_state in ctx.state.services:
                if service_state.deploy_status == "failed":
                    any_failed = True
                    failing_service = service_state
                    break

        if any_failed:
            ctx.state.failing_service_id = failing_service.service_id if failing_service else None
            ctx.state.failing_stage = failing_service.stage if failing_service else None
            progress = self._build_progress(ctx.state, current_stage="failed", overall_status="failed")
            return ctx.state, progress, None, diagnostics

        all_services_live = bool(ctx.state.services) and all(
            s.deploy_status == "live" for s in ctx.state.services
        )
        if all_services_live:
            ctx.state.completed_at = datetime.now(timezone.utc).isoformat()
            report = self._build_report(ctx.state, ctx.blueprint, success=True)
            progress = self._build_progress(ctx.state, current_stage="complete", overall_status="complete")
            return ctx.state, progress, report, diagnostics

        progress = self._build_progress(ctx.state, current_stage="deploying", overall_status="deploying")
        return ctx.state, progress, None, diagnostics

    async def _maybe_deploy_next_service(
        self,
        ctx: PhaseContext,
        ordered_ids: list[str],
    ) -> list[DeploymentDiagnostic]:
        """After a service goes live during poll, deploy the next queued service."""
        diagnostics: list[DeploymentDiagnostic] = []
        index = ctx.state.current_service_index
        if index >= len(ordered_ids):
            return diagnostics

        service_map = {service.id: service for service in ctx.blueprint.deployable_services}
        parsed = parse_github_url(ctx.source_url)
        if not parsed or not parsed.owner or not parsed.repo:
            return diagnostics

        ctx_base = DeployContext(
            owner=parsed.owner,
            repo=parsed.repo,
            branch=ctx.branch,
            source_url=ctx.source_url,
            github_token=ctx.github_token,
            credentials=ctx.credentials,
            env_vars=ctx.env_vars,
        )

        while index < len(ordered_ids):
            service_id = ordered_ids[index]
            service = service_map.get(service_id)
            if not service:
                index += 1
                continue
            service_state = next(item for item in ctx.state.services if item.service_id == service_id)
            self._reset_failed_service_for_retry(service_state)
            if service_state.provider_job_id:
                if service_state.deploy_status == "live":
                    index += 1
                    continue
                break
            if not self._dependencies_live(ordered_ids, index, ctx.state):
                break
            try:
                await self._deploy_single_service(
                    service=service,
                    service_state=service_state,
                    ctx_base=ctx_base,
                    blueprint=ctx.blueprint,
                    env_vars=ctx.env_vars,
                    state=ctx.state,
                )
            except PlatformApiError as exc:
                logger.exception("deployment_next_service_failed service_id=%s", service_id)
                diagnostics.append(exc.to_diagnostic())
                service_state.error = str(exc)
                service_state.deploy_status = "failed"
                ctx.state.failing_service_id = service_id
                ctx.state.failing_stage = service_state.stage
                break
            index += 1
            ctx.state.current_service_index = index

        return diagnostics

    @staticmethod
    def _reset_failed_service_for_retry(service_state: DeployableServiceState) -> None:
        """Clear failed job state so execute/retry can re-trigger deployment."""
        if service_state.deploy_status != "failed":
            return
        service_state.provider_job_id = None
        service_state.error = None
        service_state.logs_excerpt = ""
        service_state.stage = "pending"
        service_state.deploy_status = "pending"
        service_state.build_status = "pending"

    def _env_for_service(
        self,
        service: DeployableService,
        env_vars: dict[str, str],
        blueprint: DeploymentBlueprint,
        state: DeploymentState | None = None,
    ) -> dict[str, str]:
        allowed = set(service.environment_variables) | set(service.required_secrets)
        for item in blueprint.environment_plan:
            if not item.service_ids or service.id in item.service_ids:
                allowed.add(item.variable)

        frontend_url = self._service_url_for_role(state, "frontend")
        backend_url = self._service_url_for_role(state, "backend")
        service_urls = {
            svc.service_id: svc.url
            for svc in (state.services if state else [])
            if svc.url
        }

        resolved: dict[str, str] = {}
        for key in allowed:
            user_value = env_vars.get(key, "").strip()
            if user_value:
                resolved[key] = user_value
                continue
            auto_value = resolve_auto_value(
                key,
                service_urls=service_urls,
                frontend_url=frontend_url,
                backend_url=backend_url,
            )
            if auto_value:
                resolved[key] = auto_value
        return resolved

    def _service_url_for_role(self, state: DeploymentState | None, role: str) -> str | None:
        if not state:
            return None
        role_tokens = {
            "frontend": ("frontend", "web", "ui", "spa", "static"),
            "backend": ("backend", "api", "server"),
        }
        tokens = role_tokens.get(role, ())
        for service_state in state.services:
            if not service_state.url or service_state.deploy_status != "live":
                continue
            name = f"{service_state.service_id} {service_state.name}".lower()
            if any(token in name for token in tokens):
                return service_state.url
        return None

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
            ],
            services=state.services,
        )

    def run_execute_sync(self, ctx: PhaseContext) -> tuple[DeploymentState, DeploymentProgress, list[DeploymentDiagnostic]]:
        return asyncio.run(self.run_execute(ctx))

    def run_monitoring_sync(
        self,
        ctx: PhaseContext,
    ) -> tuple[DeploymentState, DeploymentProgress, DeploymentReport | None, list[DeploymentDiagnostic]]:
        return asyncio.run(self.run_monitoring(ctx))

    def run_authentication_sync(
        self,
        platforms: set[str],
        credentials: dict[str, str],
    ) -> list[DeploymentDiagnostic]:
        return asyncio.run(self.run_authentication(platforms, credentials))
