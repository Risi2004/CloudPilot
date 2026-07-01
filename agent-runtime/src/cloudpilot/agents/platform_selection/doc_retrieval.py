"""Documentation retrieval for platform evaluation."""

from __future__ import annotations

import logging
from typing import Any

from cloudpilot.agents.documentation.context_builder import build_documentation_context
from cloudpilot.agents.platform_selection.prompt import extract_known_facts_from_analysis
from cloudpilot.knowledge.models import RetrievedChunk
from cloudpilot.knowledge.query_service import KnowledgeQueryService

logger = logging.getLogger(__name__)


class PlatformDocRetrieval:
    """Retrieve platform-specific documentation from the knowledge base."""

    def __init__(self) -> None:
        self._retriever = KnowledgeQueryService()

    def list_platforms(self) -> list[str]:
        return self._retriever.list_platforms()

    def build_retrieval_queries(
        self,
        *,
        repository_analysis: dict[str, Any],
        interview_answers: list[dict[str, str]],
    ) -> list[str]:
        """Build dynamic retrieval queries from repo analysis and user requirements."""
        facts = extract_known_facts_from_analysis(repository_analysis)
        scan = (repository_analysis or {}).get("facts") or repository_analysis or {}

        runtime = (scan.get("runtime") or {}).get("primary") or "application"
        frameworks = scan.get("frameworks") or {}
        frontend = ", ".join(frameworks.get("frontend") or []) or "frontend"
        backend = ", ".join(frameworks.get("backend") or []) or "backend"

        queries = [
            f"How to deploy {runtime} application",
            f"Deploy {frontend} frontend",
            f"Deploy {backend} backend API",
            "pricing free tier monthly cost",
            "environment variables configuration",
            "custom domain SSL HTTPS",
            "background workers cron jobs",
            "database hosting persistent storage",
            "automatic scaling autoscaling",
            "Docker container deployment",
            "build command start command",
            "WebSocket support",
            "zero downtime deployment rollback",
        ]

        for entry in interview_answers:
            answer = entry.get("answer", "").strip()
            question = entry.get("question", "").strip()
            if answer and question:
                queries.append(f"{question} {answer}")

        # Deduplicate while preserving order
        seen: set[str] = set()
        unique: list[str] = []
        for query in queries:
            normalized = query.lower().strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                unique.append(query)

        logger.info("Built %s retrieval queries for platform evaluation", len(unique))
        if facts:
            logger.debug("Repo facts for retrieval: %s", facts[:5])
        return unique[:20]

    def retrieve_platform_context(
        self,
        *,
        platform: str,
        queries: list[str],
        repository_analysis: dict[str, Any] | None = None,
        top_k: int = 4,
    ) -> tuple[str, list[RetrievedChunk]]:
        """Retrieve and merge documentation chunks for one platform."""
        chunks: list[RetrievedChunk] = []
        seen_ids: set[str] = set()

        for query in queries:
            results = self._retriever.retrieve(
                query,
                repository_analysis=repository_analysis,
                platform_filter=platform,
                top_k=top_k,
            )
            for chunk in results:
                if chunk.chunk_id not in seen_ids:
                    seen_ids.add(chunk.chunk_id)
                    chunks.append(chunk)

        if not chunks:
            logger.warning("No documentation retrieved for platform %s", platform)
            return f"No documentation found for {platform} in the knowledge base.", []

        # Sort by relevance score descending
        chunks.sort(key=lambda item: item.score, reverse=True)
        return build_documentation_context(chunks[: top_k * 3]), chunks[: top_k * 3]

    def retrieve_all_platforms(
        self,
        *,
        platforms: list[str],
        queries: list[str],
        repository_analysis: dict[str, Any] | None = None,
    ) -> dict[str, tuple[str, list[RetrievedChunk]]]:
        """Retrieve documentation context for each available platform."""
        output: dict[str, tuple[str, list[RetrievedChunk]]] = {}
        for platform in platforms:
            output[platform] = self.retrieve_platform_context(
                platform=platform,
                queries=queries,
                repository_analysis=repository_analysis,
            )
        return output
