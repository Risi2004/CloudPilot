"""Partial deployment failure preserves prior service state."""

from __future__ import annotations

import asyncio

import pytest

from cloudpilot.agents.architecture.models import (
    DeployableService,
    DeploymentBlueprint,
    DeploymentSequenceStep,
)
from cloudpilot.agents.deployment.errors import PlatformApiError
from cloudpilot.agents.deployment.models import DeploymentState
from cloudpilot.agents.deployment.phases import DeploymentPhase, PhaseContext
from cloudpilot.agents.deployment.pipeline import DeploymentPipeline


def _blueprint() -> DeploymentBlueprint:
    return DeploymentBlueprint(
        deployable_services=[
            DeployableService(id="backend", name="Backend", platform="render"),
            DeployableService(id="frontend", name="Frontend", platform="vercel"),
        ],
        deployment_sequence=[
            DeploymentSequenceStep(order=1, service_id="backend", action="deploy"),
            DeploymentSequenceStep(order=2, service_id="frontend", action="deploy"),
        ],
    )


def test_execute_partial_failure_preserves_first_service(monkeypatch) -> None:
    pipeline = DeploymentPipeline()
    state = DeploymentState()
    ctx = PhaseContext(
        blueprint=_blueprint(),
        source_url="https://github.com/acme/demo",
        branch="main",
        credentials={"vercel_token": "token", "render_api_key": "rnd_test"},
        github_token=None,
        env_vars={},
        state=state,
        ordered_service_ids=["backend", "frontend"],
    )

    async def fake_deploy(self, *, service, service_state, **kwargs) -> None:
        if service.id == "backend":
            service_state.provider_resource_id = "srv_backend"
            service_state.provider_job_id = "dep_backend"
            service_state.deploy_status = "live"
            service_state.url = "https://backend.onrender.com"
            service_state.stage = "live"
            return
        raise PlatformApiError(
            message="Vercel project is not linked to GitHub.",
            code="vercel_missing_repo_link",
            phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
            platform="vercel",
            service_id="frontend",
        )

    monkeypatch.setattr(DeploymentPipeline, "_deploy_single_service", fake_deploy)

    state, progress, diagnostics = asyncio.run(pipeline.run_execute(ctx))

    backend = next(s for s in state.services if s.service_id == "backend")
    frontend = next(s for s in state.services if s.service_id == "frontend")

    assert backend.provider_resource_id == "srv_backend"
    assert backend.provider_job_id == "dep_backend"
    assert backend.deploy_status == "live"
    assert backend.url == "https://backend.onrender.com"
    assert frontend.deploy_status == "failed"
    assert progress.overall_status == "failed"
    assert diagnostics
    assert diagnostics[0].code == "vercel_missing_repo_link"
    assert state.failing_service_id == "frontend"
