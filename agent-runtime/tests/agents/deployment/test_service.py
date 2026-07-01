"""Deployment service orchestration tests."""

from cloudpilot.agents.architecture.models import DeployableService, DeploymentBlueprint
from cloudpilot.agents.deployment.models import DeploymentRequest
from cloudpilot.agents.deployment.service import DeploymentService


def _request(**overrides):
    blueprint = DeploymentBlueprint(
        deployable_services=[
            DeployableService(
                id="frontend",
                name="Frontend",
                platform="vercel",
                build_command="npm run build",
                output_directory="dist",
            ),
        ],
    )
    base = {
        "action": "execute",
        "blueprint": blueprint.model_dump(),
        "repository_analysis": {
            "source": {"default_branch": "main"},
            "facts": {"health": {"has_build_command": True}},
        },
        "source_url": "https://github.com/acme/demo",
        "branch": "main",
        "credentials": {"vercel_token": "token"},
        "env_vars": {},
        "confirmed": False,
    }
    base.update(overrides)
    return DeploymentRequest.model_validate(base)


def test_execute_blocked_without_confirmation() -> None:
    result = DeploymentService().run(_request())
    assert result.status == "awaiting_confirmation"
    assert "confirmation" in result.message.lower()


def test_prepare_returns_needs_input_for_missing_credentials() -> None:
    request = _request(action="prepare", confirmed=False)
    request.credentials.vercel_token = None
    result = DeploymentService().run(request)
    assert result.status in {"needs_input", "preparing"}
    assert result.missing_inputs
