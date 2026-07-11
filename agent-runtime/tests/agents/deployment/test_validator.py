"""Blueprint validator tests."""

from cloudpilot.agents.architecture.models import (
    DeployableService,
    DeploymentBlueprint,
    DeploymentSequenceStep,
)
from cloudpilot.agents.deployment.validator import BlueprintValidator


def _sample_blueprint() -> DeploymentBlueprint:
    return DeploymentBlueprint(
        overall_summary="Test app",
        deployable_services=[
            DeployableService(
                id="frontend",
                name="Frontend",
                platform="vercel",
                build_command="npm run build",
                output_directory="dist",
            ),
            DeployableService(
                id="backend",
                name="Backend",
                platform="render",
                build_command="npm install",
                start_command="npm start",
                environment_variables=["PORT"],
                required_secrets=["DATABASE_URL"],
            ),
        ],
        deployment_sequence=[
            DeploymentSequenceStep(order=1, service_id="backend", action="deploy"),
            DeploymentSequenceStep(order=2, service_id="frontend", action="deploy"),
        ],
    )


def _sample_analysis() -> dict:
    return {
        "source": {"default_branch": "main"},
        "facts": {
            "health": {"has_build_command": True, "has_deployment_files": True},
            "deployment": {"files": [{"path": "package.json", "type": "manifest"}]},
            "architecture": {"types": ["fullstack"]},
        },
    }


def test_validator_detects_unsupported_platform() -> None:
    blueprint = _sample_blueprint()
    blueprint.deployable_services[0].platform = "aws"
    validator = BlueprintValidator()
    issues, missing, _branch = validator.validate(
        blueprint=blueprint,
        repository_analysis=_sample_analysis(),
        source_url="https://github.com/acme/demo",
        branch="main",
        credentials={"vercel_token": "x", "render_api_key": "y"},
        env_vars={"PORT": "3000", "DATABASE_URL": "postgres://db"},
        github_token=None,
    )
    assert any(issue.code == "unsupported_platform" for issue in issues)


def test_validator_reports_missing_env_and_credentials() -> None:
    validator = BlueprintValidator()
    issues, missing, _branch = validator.validate(
        blueprint=_sample_blueprint(),
        repository_analysis=_sample_analysis(),
        source_url="https://github.com/acme/demo",
        branch="main",
        credentials={},
        env_vars={},
        github_token=None,
    )
    assert not any(issue.code == "unsupported_platform" for issue in issues)
    assert any(item.kind == "credential" for item in missing)
    assert any(item.name == "DATABASE_URL" for item in missing)


def test_validator_invalid_sequence_reference() -> None:
    blueprint = _sample_blueprint()
    blueprint.deployment_sequence.append(
        DeploymentSequenceStep(order=3, service_id="missing", action="deploy"),
    )
    validator = BlueprintValidator()
    issues, _missing, _branch = validator.validate(
        blueprint=blueprint,
        repository_analysis=_sample_analysis(),
        source_url="https://github.com/acme/demo",
        branch="main",
        credentials={"vercel_token": "x", "render_api_key": "y"},
        env_vars={"PORT": "3000", "DATABASE_URL": "postgres://db"},
        github_token=None,
    )
    # Normalize drops unknown sequence entries before error checks.
    assert not any(issue.code == "invalid_sequence" for issue in issues)
    assert all(step.service_id in {"frontend", "backend"} for step in blueprint.deployment_sequence)


def test_normalize_drops_database_and_rebuilds_if_needed() -> None:
    blueprint = DeploymentBlueprint(
        deployable_services=[
            DeployableService(id="backend", name="API", platform="render", build_command="npm i"),
        ],
        deployment_sequence=[
            DeploymentSequenceStep(order=1, service_id="database", action="provision"),
            DeploymentSequenceStep(order=2, service_id="frontend", action="deploy"),
            DeploymentSequenceStep(order=3, service_id="backend", action="deploy"),
        ],
    )
    BlueprintValidator.normalize_blueprint(blueprint)
    assert [step.service_id for step in blueprint.deployment_sequence] == ["backend"]


def test_missing_required_files_not_false_positive_with_frameworks() -> None:
    blueprint = _sample_blueprint()
    analysis = {
        "source": {"default_branch": "main"},
        "facts": {
            "deployment": {"files": []},
            "frameworks": {"backend": ["express"], "frontend": ["react"]},
            "package_manager": {"primary": "npm"},
            "commands": {"build": "npm run build", "start": "npm start"},
        },
    }
    validator = BlueprintValidator()
    issues, _missing, _branch = validator.validate(
        blueprint=blueprint,
        repository_analysis=analysis,
        source_url="https://github.com/acme/demo",
        branch="main",
        credentials={"vercel_token": "x", "render_api_key": "y"},
        env_vars={"PORT": "3000", "DATABASE_URL": "postgres://db"},
        github_token=None,
    )
    assert not any(issue.code == "missing_required_files" for issue in issues)
