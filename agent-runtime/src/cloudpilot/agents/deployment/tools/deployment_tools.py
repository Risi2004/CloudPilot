"""ADK tools for the Deployment Agent."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.architecture.models import DeploymentBlueprint
from cloudpilot.agents.deployment.providers.factory import list_supported_platforms
from cloudpilot.agents.deployment.validator import BlueprintValidator
from cloudpilot.agents.documentation.context_builder import build_documentation_context
from cloudpilot.knowledge.query_service import KnowledgeQueryService


def list_deployment_platforms(tool_context: Any | None = None) -> dict:
    """List deployment platforms available for execution."""
    _ = tool_context
    return {"platforms": list_supported_platforms()}


def search_deployment_docs(
    question: str,
    platform: str | None = None,
    tool_context: Any | None = None,
) -> dict:
    """Search official deployment documentation for a platform."""
    _ = tool_context
    service = KnowledgeQueryService()
    chunks = service.retrieve(question=question, platform_filter=platform, top_k=6)
    return {
        "platform": platform,
        "context": build_documentation_context(chunks),
        "citations": [chunk.model_dump() for chunk in chunks],
    }


def validate_blueprint_tool(
    blueprint: dict,
    repository_analysis: dict,
    source_url: str,
    tool_context: Any | None = None,
) -> dict:
    """Validate a deployment blueprint without executing deployment."""
    _ = tool_context
    validator = BlueprintValidator()
    parsed = DeploymentBlueprint.model_validate(blueprint)
    issues, missing, branch = validator.validate(
        blueprint=parsed,
        repository_analysis=repository_analysis,
        source_url=source_url,
        branch=None,
        credentials={},
        env_vars={},
        github_token=None,
    )
    return {
        "branch": branch,
        "issues": [issue.model_dump() for issue in issues],
        "missing_inputs": [item.model_dump() for item in missing],
    }
