"""Tests for architecture blueprint models."""

from __future__ import annotations

from cloudpilot.agents.architecture.models import DeploymentBlueprint, ServiceDependency


def test_deployment_blueprint_defaults() -> None:
    blueprint = DeploymentBlueprint(overall_summary="Test")
    assert blueprint.confidence_score == 0.5
    assert blueprint.application_type == "unknown"


def test_service_dependency_aliases() -> None:
    dep = ServiceDependency.model_validate(
        {"from": "frontend", "to": "api", "type": "http", "description": "calls API"}
    )
    assert dep.from_service == "frontend"
    assert dep.to_service == "api"
