"""Production documentation query service."""

from __future__ import annotations

import json
import logging
from typing import Any

import litellm

from cloudpilot.agents.documentation.context_builder import (
    build_documentation_context,
    build_repository_context,
    fallback_answer,
    parse_llm_answer,
)
from cloudpilot.agents.documentation.prompt import build_answer_prompt
from cloudpilot.agents.documentation.schemas import SearchDocumentationOutput
from cloudpilot.config import configure_runtime, get_litellm_model_id
from cloudpilot.knowledge.models import DocumentationAnswer, DocumentationQueryRequest
from cloudpilot.knowledge.query_service import KnowledgeQueryService

logger = logging.getLogger(__name__)

_INSUFFICIENT_MARKERS = (
    "does not contain enough documentation",
    "insufficient documentation",
    "not enough documentation",
)


class DocumentationQueryService:
    """Retrieve documentation and generate grounded answers with local Qwen."""

    def __init__(self) -> None:
        configure_runtime()
        self._retriever = KnowledgeQueryService()

    def query(self, request: DocumentationQueryRequest) -> DocumentationAnswer:
        chunks = self._retriever.retrieve_from_request(request)
        if not chunks:
            return fallback_answer(request.question, chunks)

        documentation_context = build_documentation_context(chunks)
        repository_context = build_repository_context(request.repository_analysis)

        try:
            return self._generate_answer(
                question=request.question,
                documentation_context=documentation_context,
                repository_context=repository_context,
                chunks=chunks,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Documentation LLM synthesis failed; returning retrieval fallback",
                extra={"error": str(exc)},
            )
            return fallback_answer(request.question, chunks)

    def _generate_answer(
        self,
        *,
        question: str,
        documentation_context: str,
        repository_context: str | None,
        chunks: list,
    ) -> DocumentationAnswer:
        prompt = build_answer_prompt(question, documentation_context, repository_context)
        model_id = get_litellm_model_id()

        response = litellm.completion(
            model=model_id,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are CloudPilot's Documentation Agent. "
                        "Respond with valid JSON only. "
                        "Ground answers in retrieved documentation."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            timeout=1800,
        )
        content = response.choices[0].message.content or ""
        payload = json.loads(content)
        answer = parse_llm_answer(payload, chunks)
        answer.retrieved_chunk_count = len(chunks)

        if any(marker in answer.answer.lower() for marker in _INSUFFICIENT_MARKERS):
            answer.insufficient_documentation = True
            answer.confidence = "low"

        return answer

    @staticmethod
    def search_tool_preview(question: str, platform: str | None = None) -> SearchDocumentationOutput:
        chunks = KnowledgeQueryService().retrieve(question, platform_filter=platform)
        return SearchDocumentationOutput(
            chunk_count=len(chunks),
            context=build_documentation_context(chunks),
        )
