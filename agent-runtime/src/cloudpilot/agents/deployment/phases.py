"""Deployment pipeline phase definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from cloudpilot.agents.architecture.models import DeploymentBlueprint
from cloudpilot.agents.deployment.models import DeploymentState


class DeploymentPhase(str, Enum):
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    PROJECT_CREATION = "project_creation"
    CONFIGURATION = "configuration"
    DEPLOYMENT_EXECUTION = "deployment_execution"
    MONITORING = "monitoring"
    REPORTING = "reporting"


@dataclass(slots=True)
class PhaseContext:
    """Shared context passed through deployment pipeline phases."""

    blueprint: DeploymentBlueprint
    source_url: str
    branch: str
    credentials: dict[str, str]
    github_token: str | None
    env_vars: dict[str, str]
    state: DeploymentState
    ordered_service_ids: list[str] = field(default_factory=list)
    secrets_for_redaction: list[str] = field(default_factory=list)
