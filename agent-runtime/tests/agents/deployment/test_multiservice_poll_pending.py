"""Multi-service poll must not fail queued pending services."""

from __future__ import annotations

import asyncio

from cloudpilot.agents.architecture.models import (
    DeployableService,
    DeploymentBlueprint,
    DeploymentSequenceStep,
)
from cloudpilot.agents.deployment.errors import PlatformApiError
from cloudpilot.agents.deployment.models import DeployableServiceState, DeploymentState
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


def test_poll_does_not_fail_queued_pending_services(monkeypatch) -> None:
    """After execute starts service 1, service 2 stays pending until deps are live."""
    pipeline = DeploymentPipeline()
    state = DeploymentState(
        current_service_index=1,
        services=[
            DeployableServiceState(
                service_id="backend",
                platform="render",
                stage="deploying",
                deploy_status="deploying",
                provider_resource_id="srv_backend",
                provider_job_id="dep_backend",
            ),
            DeployableServiceState(
                service_id="frontend",
                platform="vercel",
                stage="pending",
                deploy_status="pending",
            ),
        ],
    )
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

    class FakeStatus:
        stage = "deploying"
        build_status = "building"
        deploy_status = "deploying"
        url = None
        error = None
        failed = False
        ready = False

    class FakeProvider:
        async def get_status(self, *args, **kwargs):
            return FakeStatus()

        async def fetch_logs(self, *args, **kwargs):
            return ""

    monkeypatch.setattr(
        "cloudpilot.agents.deployment.pipeline.get_provider",
        lambda platform: FakeProvider(),
    )

    state_out, progress, report, diagnostics = asyncio.run(pipeline.run_monitoring(ctx))

    assert progress.overall_status == "deploying"
    assert not any(d.code == "missing_provider_resource" for d in diagnostics)
    frontend = next(s for s in state_out.services if s.service_id == "frontend")
    assert frontend.stage == "pending"
    assert frontend.deploy_status == "pending"


def test_poll_deploys_next_service_when_prior_goes_live(monkeypatch) -> None:
    pipeline = DeploymentPipeline()
    state = DeploymentState(
        current_service_index=1,
        services=[
            DeployableServiceState(
                service_id="backend",
                platform="render",
                stage="live",
                deploy_status="live",
                provider_resource_id="srv_backend",
                provider_job_id="dep_backend",
                url="https://backend.onrender.com",
            ),
            DeployableServiceState(
                service_id="frontend",
                platform="vercel",
                stage="pending",
                deploy_status="pending",
            ),
        ],
    )
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

    class FakeStatus:
        stage = "live"
        build_status = "ready"
        deploy_status = "live"
        url = "https://backend.onrender.com"
        error = None
        failed = False
        ready = True

    class FakeProvider:
        async def get_status(self, *args, **kwargs):
            return FakeStatus()

        async def fetch_logs(self, *args, **kwargs):
            return ""

    async def fake_deploy(self, *, service, service_state, **kwargs) -> None:
        service_state.provider_resource_id = "prj_frontend"
        service_state.provider_job_id = "dpl_frontend"
        service_state.deploy_status = "deploying"
        service_state.stage = "deploying"

    monkeypatch.setattr(
        "cloudpilot.agents.deployment.pipeline.get_provider",
        lambda platform: FakeProvider(),
    )
    monkeypatch.setattr(DeploymentPipeline, "_deploy_single_service", fake_deploy)

    state_out, progress, report, diagnostics = asyncio.run(pipeline.run_monitoring(ctx))

    assert progress.overall_status == "deploying"
    assert not any(d.code == "missing_provider_resource" for d in diagnostics)
    frontend = next(s for s in state_out.services if s.service_id == "frontend")
    assert frontend.provider_resource_id == "prj_frontend"
    assert frontend.provider_job_id == "dpl_frontend"
    assert frontend.deploy_status == "deploying"


def test_execute_retries_failed_service_with_job_id(monkeypatch) -> None:
    pipeline = DeploymentPipeline()
    state = DeploymentState(
        current_service_index=0,
        services=[
            DeployableServiceState(
                service_id="backend",
                platform="render",
                stage="failed",
                deploy_status="failed",
                provider_resource_id="srv_backend",
                provider_job_id="dep_failed",
                error="build failed",
            ),
            DeployableServiceState(
                service_id="frontend",
                platform="vercel",
                stage="pending",
                deploy_status="pending",
            ),
        ],
        failing_service_id="backend",
    )
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

    deployed: list[str] = []

    async def fake_deploy(self, *, service, service_state, **kwargs) -> None:
        deployed.append(service.id)
        service_state.provider_resource_id = service_state.provider_resource_id or f"res_{service.id}"
        service_state.provider_job_id = f"job_{service.id}_retry"
        service_state.deploy_status = "deploying"
        service_state.stage = "deploying"
        service_state.error = None

    monkeypatch.setattr(DeploymentPipeline, "_deploy_single_service", fake_deploy)

    state_out, progress, diagnostics = asyncio.run(pipeline.run_execute(ctx))

    assert deployed == ["backend"]
    backend = next(s for s in state_out.services if s.service_id == "backend")
    assert backend.provider_job_id == "job_backend_retry"
    assert backend.deploy_status == "deploying"
    assert progress.current_stage == "deploying"
    # Frontend waits until backend is live; dependency diagnostic is expected.
    assert all(d.code == "dependency_not_live" for d in diagnostics)


def test_poll_surfaces_next_service_platform_error(monkeypatch) -> None:
    pipeline = DeploymentPipeline()
    state = DeploymentState(
        current_service_index=1,
        services=[
            DeployableServiceState(
                service_id="backend",
                platform="render",
                stage="live",
                deploy_status="live",
                provider_resource_id="srv_backend",
                provider_job_id="dep_backend",
                url="https://backend.onrender.com",
            ),
            DeployableServiceState(
                service_id="frontend",
                platform="vercel",
                stage="pending",
                deploy_status="pending",
            ),
        ],
    )
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

    class FakeStatus:
        stage = "live"
        build_status = "ready"
        deploy_status = "live"
        url = "https://backend.onrender.com"
        error = None
        failed = False
        ready = True

    class FakeProvider:
        async def get_status(self, *args, **kwargs):
            return FakeStatus()

        async def fetch_logs(self, *args, **kwargs):
            return ""

    async def fake_deploy(self, *, service, service_state, **kwargs) -> None:
        raise PlatformApiError(
            message="Vercel project is not linked to GitHub.",
            code="vercel_missing_repo_link",
            phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
            platform="vercel",
            service_id=service.id,
        )

    monkeypatch.setattr(
        "cloudpilot.agents.deployment.pipeline.get_provider",
        lambda platform: FakeProvider(),
    )
    monkeypatch.setattr(DeploymentPipeline, "_deploy_single_service", fake_deploy)

    state_out, progress, report, diagnostics = asyncio.run(pipeline.run_monitoring(ctx))

    assert progress.overall_status == "failed"
    assert diagnostics
    assert diagnostics[0].code == "vercel_missing_repo_link"
    frontend = next(s for s in state_out.services if s.service_id == "frontend")
    assert frontend.deploy_status == "failed"
