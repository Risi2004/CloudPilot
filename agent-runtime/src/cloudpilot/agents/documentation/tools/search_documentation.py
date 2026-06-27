"""Documentation search tool for ADK agent."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.documentation.context_builder import build_documentation_context
from cloudpilot.agents.documentation.schemas import SearchDocumentationInput, SearchDocumentationOutput
from cloudpilot.knowledge.query_service import KnowledgeQueryService


def search_documentation(
    question: str,
    platform: str | None = None,
    tool_context: Any | None = None,
) -> dict:
    """
    Retrieve relevant documentation chunks for a natural language question.

    Use this tool before answering deployment, configuration, or platform questions.
    """
    _ = tool_context
    validated = SearchDocumentationInput(question=question, platform=platform)
    chunks = KnowledgeQueryService().retrieve(
        validated.question,
        platform_filter=validated.platform,
    )
    context = build_documentation_context(chunks)
    return SearchDocumentationOutput(chunk_count=len(chunks), context=context).model_dump()
