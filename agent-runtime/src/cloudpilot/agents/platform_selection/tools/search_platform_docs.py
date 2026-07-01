"""ADK tools for the Platform Selection Agent."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.documentation.context_builder import build_documentation_context
from cloudpilot.agents.platform_selection.doc_retrieval import PlatformDocRetrieval
from cloudpilot.agents.platform_selection.schemas import (
    ListPlatformsOutput,
    SearchPlatformDocsInput,
    SearchPlatformDocsOutput,
)
from cloudpilot.knowledge.query_service import KnowledgeQueryService


def list_available_platforms(tool_context: Any | None = None) -> dict:
    """
    List deployment platforms indexed in the CloudPilot knowledge base.

    Use this to discover which platforms can be evaluated without hardcoding names.
    """
    _ = tool_context
    platforms = PlatformDocRetrieval().list_platforms()
    return ListPlatformsOutput(platforms=platforms, count=len(platforms)).model_dump()


def search_platform_documentation(
    question: str,
    platform: str | None = None,
    tool_context: Any | None = None,
) -> dict:
    """
    Retrieve official platform documentation for deployment evaluation.

    Always use this before stating platform capabilities or limitations.
    """
    _ = tool_context
    validated = SearchPlatformDocsInput(question=question, platform=platform)

    if validated.platform:
        context, chunks = PlatformDocRetrieval().retrieve_platform_context(
            platform=validated.platform,
            queries=[validated.question],
        )
    else:
        chunks = KnowledgeQueryService().retrieve(validated.question)
        context = build_documentation_context(chunks)

    return SearchPlatformDocsOutput(
        platform=validated.platform,
        chunk_count=len(chunks),
        context=context,
    ).model_dump()
