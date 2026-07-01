"""Pydantic models for the Architecture Agent."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from cloudpilot.agents.platform_selection.models import InterviewAnswer, coerce_string_list
from cloudpilot.knowledge.models import Citation


class ServiceInventoryItem(BaseModel):
    id: str
    name: str
    type: str
    platform: str = ""
    role: str = ""
    description: str = ""


class DeployableService(BaseModel):
    id: str
    name: str
    platform: str
    build_command: str = ""
    start_command: str = ""
    runtime_version: str = ""
    root_directory: str = "."
    output_directory: str = ""
    environment_variables: list[str] = Field(default_factory=list)
    required_secrets: list[str] = Field(default_factory=list)
    health_check_path: str | None = None
    public_url_placeholder: str | None = None

    @field_validator("environment_variables", "required_secrets", mode="before")
    @classmethod
    def _coerce_lists(cls, value: Any) -> list[str]:
        return coerce_string_list(value)


class DeploymentSequenceStep(BaseModel):
    order: int = 1
    service_id: str = ""
    action: str = ""
    notes: str = ""


class ServiceDependency(BaseModel):
    from_service: str = Field(alias="from")
    to_service: str = Field(alias="to")
    type: str = "runtime"
    description: str = ""

    model_config = {"populate_by_name": True}


class EnvironmentPlanItem(BaseModel):
    variable: str
    scope: str = "backend"
    service_ids: list[str] = Field(default_factory=list)
    description: str = ""

    @field_validator("service_ids", mode="before")
    @classmethod
    def _coerce_service_ids(cls, value: Any) -> list[str]:
        return coerce_string_list(value)


class NetworkingPlan(BaseModel):
    public_endpoints: list[str] = Field(default_factory=list)
    internal_endpoints: list[str] = Field(default_factory=list)
    cors_notes: str = ""
    domain_structure: str = ""

    @field_validator("public_endpoints", "internal_endpoints", mode="before")
    @classmethod
    def _coerce_endpoints(cls, value: Any) -> list[str]:
        return coerce_string_list(value)


class ScalingRecommendation(BaseModel):
    service_id: str = ""
    strategy: str = ""
    explanation: str = ""


class ArchitecturalRisk(BaseModel):
    risk: str
    severity: Literal["low", "medium", "high"] = "medium"
    explanation: str = ""
    recommendation: str = ""


class PlatformAssignmentItem(BaseModel):
    service_id: str
    platform: str
    reason: str = ""


class DetectedComponent(BaseModel):
    id: str
    name: str
    type: str
    evidence: list[str] = Field(default_factory=list)


class ComponentAnalysis(BaseModel):
    components: list[DetectedComponent] = Field(default_factory=list)
    application_type: str = "unknown"
    summary: str = ""


class DeploymentBlueprint(BaseModel):
    overall_summary: str = ""
    application_type: str = "unknown"
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.5)
    service_inventory: list[ServiceInventoryItem] = Field(default_factory=list)
    deployable_services: list[DeployableService] = Field(default_factory=list)
    deployment_sequence: list[DeploymentSequenceStep] = Field(default_factory=list)
    service_dependencies: list[ServiceDependency] = Field(default_factory=list)
    environment_plan: list[EnvironmentPlanItem] = Field(default_factory=list)
    networking: NetworkingPlan = Field(default_factory=NetworkingPlan)
    scaling_recommendations: list[ScalingRecommendation] = Field(default_factory=list)
    infrastructure_requirements: list[str] = Field(default_factory=list)
    architectural_risks: list[ArchitecturalRisk] = Field(default_factory=list)
    platform_assignment: list[PlatformAssignmentItem] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    documentation_gaps: list[str] = Field(default_factory=list)

    @field_validator("infrastructure_requirements", "documentation_gaps", mode="before")
    @classmethod
    def _coerce_string_lists(cls, value: Any) -> list[str]:
        return coerce_string_list(value)


class ArchitectureRequest(BaseModel):
    repository_analysis: dict[str, Any]
    platform_recommendation: dict[str, Any]
    user_preferences: list[InterviewAnswer] = Field(default_factory=list)
    platform_filter: str | None = None


class ArchitectureResult(BaseModel):
    blueprint: DeploymentBlueprint
    component_analysis: ComponentAnalysis = Field(default_factory=ComponentAnalysis)
    platforms_evaluated: list[str] = Field(default_factory=list)

    def to_json(self, *, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent, exclude_none=True)
