"""Deployment pipeline phase tests."""

from cloudpilot.agents.architecture.models import (
    DeployableService,
    DeploymentBlueprint,
    DeploymentSequenceStep,
)
from cloudpilot.agents.deployment.models import DeployableServiceState, DeploymentState
from cloudpilot.agents.deployment.phases import PhaseContext
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


def test_ordered_service_ids_respects_sequence() -> None:
    pipeline = DeploymentPipeline()
    ordered = pipeline.ordered_service_ids(_blueprint())
    assert ordered == ["backend", "frontend"]


def test_ordered_ids_ignores_unknown_sequence_and_keeps_deployable() -> None:
    pipeline = DeploymentPipeline()
    blueprint = DeploymentBlueprint(
        deployable_services=[
            DeployableService(id="backend", name="API", platform="render"),
        ],
        deployment_sequence=[
            DeploymentSequenceStep(order=1, service_id="database", action="provision"),
            DeploymentSequenceStep(order=2, service_id="frontend", action="deploy"),
        ],
    )
    assert pipeline.ordered_service_ids(blueprint) == ["backend"]


def test_execute_recovers_when_index_past_unknown_sequence(monkeypatch) -> None:
    import asyncio

    pipeline = DeploymentPipeline()
    blueprint = DeploymentBlueprint(
        deployable_services=[
            DeployableService(id="backend", name="API", platform="render", build_command="npm i"),
        ],
        deployment_sequence=[
            DeploymentSequenceStep(order=1, service_id="database", action="provision"),
        ],
    )
    state = DeploymentState(
        current_service_index=1,
        services=[
            DeployableServiceState(
                service_id="backend",
                name="API",
                platform="render",
                stage="pending",
                deploy_status="pending",
            ),
        ],
    )
    ctx = PhaseContext(
        blueprint=blueprint,
        source_url="https://github.com/acme/demo",
        branch="main",
        credentials={"render_api_key": "rnd_test"},
        github_token=None,
        env_vars={},
        state=state,
        ordered_service_ids=["database"],
    )

    async def fake_deploy(self, *, service, service_state, **kwargs) -> None:
        service_state.provider_resource_id = "srv_1"
        service_state.provider_job_id = "dep_1"
        service_state.deploy_status = "deploying"
        service_state.stage = "deploying"

    monkeypatch.setattr(DeploymentPipeline, "_deploy_single_service", fake_deploy)
    state_out, progress, diagnostics = asyncio.run(pipeline.run_execute(ctx))
    assert state_out.services[0].provider_job_id == "dep_1"
    assert progress.overall_status == "deploying"
    assert not any(d.code == "deploy_not_started" for d in diagnostics)



def test_dependencies_live_requires_prior_services() -> None:
    pipeline = DeploymentPipeline()
    state = DeploymentState(
        services=[
            DeployableServiceState(service_id="backend", name="Backend", platform="render", deploy_status="deploying"),
            DeployableServiceState(service_id="frontend", name="Frontend", platform="vercel"),
        ],
    )
    assert pipeline._dependencies_live(["backend", "frontend"], 0, state) is True
    assert pipeline._dependencies_live(["backend", "frontend"], 1, state) is False

    state.services[0].deploy_status = "live"
    assert pipeline._dependencies_live(["backend", "frontend"], 1, state) is True
