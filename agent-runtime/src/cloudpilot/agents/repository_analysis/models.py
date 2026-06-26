"""Repository Analysis Agent output models."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from cloudpilot.scanner.models import ScanResult

_NARRATIVE_STRING_FIELDS = (
    "project_overview",
    "technology_stack_summary",
    "architecture_summary",
    "deployment_readiness",
    "recommended_deployment_strategy",
)

_LIST_FIELDS = (
    "missing_configuration_files",
    "potential_deployment_issues",
    "risks_before_deployment",
)


def coerce_narrative_text(value: Any) -> str:
    """Convert LLM output to narrative text when models return nested JSON objects."""
    if isinstance(value, str):
        return value.strip()
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, indent=2)
    return str(value).strip()


def coerce_string_list(value: Any) -> list[str]:
    """Normalize list fields that may arrive as a string or nested structure."""
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        items: list[str] = []
        for item in value:
            if isinstance(item, str):
                items.append(item)
            elif isinstance(item, dict):
                items.append(json.dumps(item))
            else:
                items.append(str(item))
        return items
    if isinstance(value, dict):
        return [f"{key}: {coerce_narrative_text(val)}" for key, val in value.items()]
    return [str(value)]


def normalize_analysis_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Coerce common LLM schema mistakes before Pydantic validation."""
    normalized = dict(payload)
    for field in _NARRATIVE_STRING_FIELDS:
        if field in normalized:
            normalized[field] = coerce_narrative_text(normalized[field])
    for field in _LIST_FIELDS:
        if field in normalized:
            normalized[field] = coerce_string_list(normalized[field])
    return normalized


class AnalysisNarrative(BaseModel):
    """LLM-generated repository analysis narrative."""

    project_overview: str
    technology_stack_summary: str
    architecture_summary: str
    deployment_readiness: str
    missing_configuration_files: list[str] = Field(default_factory=list)
    potential_deployment_issues: list[str] = Field(default_factory=list)
    risks_before_deployment: list[str] = Field(default_factory=list)
    recommended_deployment_strategy: str

    @model_validator(mode="before")
    @classmethod
    def normalize_llm_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return normalize_analysis_payload(data)
        return data

    @field_validator(*_NARRATIVE_STRING_FIELDS)
    @classmethod
    def ensure_string_fields(cls, value: Any) -> str:
        return coerce_narrative_text(value)

    @field_validator(*_LIST_FIELDS)
    @classmethod
    def ensure_list_fields(cls, value: Any) -> list[str]:
        return coerce_string_list(value)


class SourceMetadata(BaseModel):
    """Metadata about the analyzed repository source."""

    input: str
    kind: str
    repo_path: str
    clone_method: str | None = None
    default_branch: str | None = None
    scanned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RepositoryAnalysisResult(BaseModel):
    """Complete repository analysis output for CloudPilot agents."""

    facts: ScanResult
    analysis: AnalysisNarrative
    source: SourceMetadata

    def to_json(self, *, indent: int = 2) -> str:
        """Serialize to JSON for APIs and storage."""
        return self.model_dump_json(indent=indent, exclude_none=True)
