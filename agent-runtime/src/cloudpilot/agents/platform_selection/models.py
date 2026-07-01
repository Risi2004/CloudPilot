"""Pydantic models for the Platform Selection Agent."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from cloudpilot.knowledge.models import Citation


class InterviewAnswer(BaseModel):
    """A single user response during the adaptive interview."""

    question_id: str
    question: str
    answer: str


class InterviewQuestion(BaseModel):
    """Next question to ask during the adaptive interview."""

    id: str
    text: str
    answer_type: Literal["text", "choice", "boolean", "multi_choice"] = "text"
    choices: list[str] = Field(default_factory=list)
    rationale: str | None = None
    context: str | None = None


class AlternativePlatform(BaseModel):
    """An alternative deployment platform with fit assessment."""

    platform: str
    fit_score: float = Field(ge=0.0, le=1.0, default=0.5)
    summary: str = ""
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)


class HybridComponent(BaseModel):
    """One component in a hybrid deployment strategy."""

    platform: str
    role: str
    reason: str = ""


class HybridDeployment(BaseModel):
    """Hybrid multi-platform deployment recommendation."""

    recommended: bool = False
    description: str = ""
    components: list[HybridComponent] = Field(default_factory=list)


class ExpectedCosts(BaseModel):
    """Cost expectations grounded in official documentation."""

    summary: str = ""
    estimate_range: str | None = None
    notes: list[str] = Field(default_factory=list)
    grounded_in_documentation: bool = True


class PlatformRecommendation(BaseModel):
    """Final grounded platform recommendation."""

    primary_platform: str
    alternatives: list[AlternativePlatform] = Field(default_factory=list)
    hybrid_deployment: HybridDeployment = Field(default_factory=HybridDeployment)
    required_services: list[str] = Field(default_factory=list)
    deployment_complexity: Literal["low", "medium", "high"] = "medium"
    configuration_steps: list[str] = Field(default_factory=list)
    build_commands: list[str] = Field(default_factory=list)
    runtime_requirements: list[str] = Field(default_factory=list)
    environment_variables: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    expected_costs: ExpectedCosts = Field(default_factory=ExpectedCosts)
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.5)
    explanation: str = ""
    citations: list[Citation] = Field(default_factory=list)
    documentation_gaps: list[str] = Field(default_factory=list)


class PlatformSelectionRequest(BaseModel):
    """Request payload for one platform selection step."""

    repository_analysis: dict[str, Any]
    interview_answers: list[InterviewAnswer] = Field(default_factory=list)


class PlatformSelectionResult(BaseModel):
    """Unified response for interview or final recommendation."""

    status: Literal["interview", "complete"]
    question: InterviewQuestion | None = None
    recommendation: PlatformRecommendation | None = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    questions_asked: int = 0
    known_from_analysis: list[str] = Field(default_factory=list)
    information_gaps: list[str] = Field(default_factory=list)
    interview_summary: list[InterviewAnswer] = Field(default_factory=list)
    platforms_evaluated: list[str] = Field(default_factory=list)

    def to_json(self, *, indent: int = 2) -> str:
        return self.model_dump_json(indent=indent, exclude_none=True)


def coerce_string_list(value: Any) -> list[str]:
    """Normalize LLM output that may return strings or nested objects."""
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        result: list[str] = []
        for item in value:
            if isinstance(item, str) and item.strip():
                result.append(item.strip())
            elif isinstance(item, dict):
                text = item.get("text") or item.get("value") or item.get("description")
                if text:
                    result.append(str(text).strip())
        return result
    return []


class _InterviewLLMOutput(BaseModel):
    ready_to_recommend: bool = False
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    reasoning: str = ""
    question: InterviewQuestion | None = None
    known_from_analysis: list[str] = Field(default_factory=list)
    information_gaps: list[str] = Field(default_factory=list)

    @field_validator("known_from_analysis", "information_gaps", mode="before")
    @classmethod
    def _coerce_lists(cls, value: Any) -> list[str]:
        return coerce_string_list(value)
