"""Deployment execution against platform providers."""

from __future__ import annotations

import asyncio

from cloudpilot.agents.architecture.models import DeploymentBlueprint
from cloudpilot.agents.deployment.models import DeploymentProgress, DeploymentReport, DeploymentState
from cloudpilot.agents.deployment.phases import PhaseContext
from cloudpilot.agents.deployment.pipeline import DeploymentPipeline


class DeploymentExecutor:
    """Thin adapter delegating to the phase-based deployment pipeline."""

    def __init__(self) -> None:
        self._pipeline = DeploymentPipeline()

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
        ctx = PhaseContext(
            blueprint=blueprint,
            source_url=source_url,
            branch=branch,
            credentials=credentials,
            github_token=github_token,
            env_vars=env_vars,
            state=state,
            ordered_service_ids=self._pipeline.ordered_service_ids(blueprint),
        )
        state, progress, _diagnostics = await self._pipeline.run_execute(ctx)
        return state, progress

    async def poll(
        self,
        *,
        blueprint: DeploymentBlueprint,
        source_url: str,
        credentials: dict[str, str],
        state: DeploymentState,
        secrets_for_redaction: list[str] | None = None,
    ) -> tuple[DeploymentState, DeploymentProgress, DeploymentReport | None]:
        ctx = PhaseContext(
            blueprint=blueprint,
            source_url=source_url,
            branch=state.branch,
            credentials=credentials,
            github_token=None,
            env_vars=state.env_vars,
            state=state,
            ordered_service_ids=self._pipeline.ordered_service_ids(blueprint),
            secrets_for_redaction=secrets_for_redaction or [],
        )
        state, progress, report, _diagnostics = await self._pipeline.run_monitoring(ctx)
        return state, progress, report

    def run_execute(self, **kwargs) -> tuple[DeploymentState, DeploymentProgress]:
        return asyncio.run(self.execute(**kwargs))

    def run_poll(self, **kwargs) -> tuple[DeploymentState, DeploymentProgress, DeploymentReport | None]:
        return asyncio.run(self.poll(**kwargs))
