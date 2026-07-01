"""ADK tools for the Architecture Agent."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.architecture.doc_retrieval import ArchitectureDocRetrieval
from cloudpilot.agents.architecture.schemas import (
    ListArchitecturePlatformsOutput,
    SearchArchitectureDocsInput,
    SearchArchitectureDocsOutput,
)
from cloudpilot.agents.documentation.context_builder import build_documentation_context
from cloudpilot.knowledge.query_service import KnowledgeQueryService


def list_architecture_platforms(tool_context: Any | None = None) -> dict:
    """List deployment platforms indexed in the CloudPilot knowledge base."""
    _ = tool_context
    platforms = ArchitectureDocRetrieval().list_platforms()
    return ListArchitecturePlatformsOutput(platforms=platforms, count=len(platforms)).model_dump()


def search_architecture_documentation(
    question: str,
    platform: str | None = None,
    tool_context: Any | None = None,
) -> dict:
    """Retrieve official documentation for deployment architecture decisions."""
    _ = tool_context
    validated = SearchArchitectureDocsInput(question=question, platform=platform)

    if validated.platform:
        context, chunks = ArchitectureDocRetrieval().retrieve_platform_context(
            platform=validated.platform,
            queries=[validated.question],
        )
    else:
        chunks = KnowledgeQueryService().retrieve(validated.question)
        context = build_documentation_context(chunks)

    return SearchArchitectureDocsOutput(
        platform=validated.platform,
        chunk_count=len(chunks),
        context=context,
    ).model_dump()
