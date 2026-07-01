"""Pydantic models for the Deployment Agent."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from cloudpilot.agents.architecture.models import DeploymentBlueprint
from cloudpilot.knowledge.models import Citation


DeploymentAction = Literal[
    "prepare",
    "provide_inputs",
    "execute",
    "poll",
    "analyze_failure",
    "retry",
]

DeploymentStatus = Literal[
    "preparing",
    "needs_input",
    "awaiting_confirmation",
    "deploying",
    "failed",
    "complete",
]


class DeploymentCredentials(BaseModel):
    """Platform API credentials supplied per request (never persisted by agent)."""

    vercel_token: str | None = None
    render_api_key: str | None = None


class MissingInput(BaseModel):
    """A required input that must be collected from the user."""

    kind: Literal["credential", "env_var", "branch"]
    name: str
    description: str = ""
    platform: str | None = None


class ValidationIssue(BaseModel):
    """A blueprint or repository validation problem."""

    code: str
    message: str
    severity: Literal["error", "warning"] = "error"
    service_id: str | None = None


class ServiceSummaryItem(BaseModel):
    """One service in the pre-deployment summary."""

    service_id: str
    name: str
    platform: str
    build_command: str = ""
    start_command: str = ""
    runtime_version: str = ""
    environment_variables: list[str] = Field(default_factory=list)


class DeploymentSummary(BaseModel):
    """Pre-confirmation deployment overview."""

    repository: str
    branch: str
    platforms: list[str] = Field(default_factory=list)
    services: list[ServiceSummaryItem] = Field(default_factory=list)
    deployment_order: list[str] = Field(default_factory=list)
    environment_variables: list[str] = Field(default_factory=list)
    complexity: Literal["low", "medium", "high"] = "medium"
    estimated_duration_minutes: int = 5
    potential_risks: list[str] = Field(default_factory=list)


class DeployableServiceState(BaseModel):
    """Runtime tracking for one deployable service."""

    service_id: str
    name: str = ""
    platform: str
    provider_resource_id: str | None = None
    provider_job_id: str | None = None
    stage: str = "pending"
    build_status: str = "pending"
    deploy_status: str = "pending"
    url: str | None = None
    logs_excerpt: str = ""
    error: str | None = None
    health_check_path: str | None = None
    health_check_status: str | None = None


class DeploymentProgress(BaseModel):
    """Live deployment progress snapshot."""

    current_stage: str = "initializing"
    overall_status: str = "pending"
    services: list[DeployableServiceState] = Field(default_factory=list)
    started_at: str | None = None
    updated_at: str | None = None


class DeploymentReport(BaseModel):
    """Structured deployment report for API and frontend."""

    status: Literal["success", "failed", "partial"]
    deployment_urls: list[str] = Field(default_factory=list)
    platforms_used: list[str] = Field(default_factory=list)
    duration_seconds: float | None = None
    build_summary: str = ""
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    logs: str = ""
    recommendations: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)
    services: list[DeployableServiceState] = Field(default_factory=list)


class FailureAnalysisResult(BaseModel):
    """Doc-grounded failure analysis from Documentation Agent + Qwen."""

    root_cause: str = ""
    explanation: str = ""
    suggested_fixes: list[str] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    retry_recommended: bool = True
    insufficient_documentation: bool = False


class DeploymentState(BaseModel):
    """Persisted deployment execution state passed between steps."""

    branch: str = "main"
    env_vars: dict[str, str] = Field(default_factory=dict)
    services: list[DeployableServiceState] = Field(default_factory=list)
    started_at: str | None = None
    completed_at: str | None = None
    failing_service_id: str | None = None
    failing_stage: str | None = None


class DeploymentRequest(BaseModel):
    """Input payload for one deployment agent step."""

    action: DeploymentAction = "prepare"
    blueprint: DeploymentBlueprint | dict[str, Any]
    repository_analysis: dict[str, Any]
    source_url: str
    branch: str | None = None
    credentials: DeploymentCredentials = Field(default_factory=DeploymentCredentials)
    github_token: str | None = None
    env_vars: dict[str, str] = Field(default_factory=dict)
    confirmed: bool = False
    deployment_state: DeploymentState | dict[str, Any] | None = None

    def resolved_blueprint(self) -> DeploymentBlueprint:
        if isinstance(self.blueprint, DeploymentBlueprint):
            return self.blueprint
        return DeploymentBlueprint.model_validate(self.blueprint)

    def resolved_state(self) -> DeploymentState:
        if self.deployment_state is None:
            return DeploymentState()
        if isinstance(self.deployment_state, DeploymentState):
            return self.deployment_state
        return DeploymentState.model_validate(self.deployment_state)


class DeploymentResult(BaseModel):
    """Unified response from the Deployment Agent."""

    status: DeploymentStatus
    validation_issues: list[ValidationIssue] = Field(default_factory=list)
    missing_inputs: list[MissingInput] = Field(default_factory=list)
    deployment_summary: DeploymentSummary | None = None
    deployment_state: DeploymentState | None = None
    progress: DeploymentProgress | None = None
    report: DeploymentReport | None = None
    failure_analysis: FailureAnalysisResult | None = None
    message: str = ""

    def to_json(self, *, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent, exclude_none=True)
