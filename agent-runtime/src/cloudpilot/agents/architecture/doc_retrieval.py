"""Documentation retrieval for architecture blueprint synthesis."""

from __future__ import annotations

import logging
from typing import Any

from cloudpilot.agents.architecture.models import ComponentAnalysis
from cloudpilot.agents.documentation.context_builder import build_documentation_context
from cloudpilot.agents.platform_selection.prompt import extract_known_facts_from_analysis
from cloudpilot.knowledge.models import RetrievedChunk
from cloudpilot.knowledge.query_service import KnowledgeQueryService

logger = logging.getLogger(__name__)


class ArchitectureDocRetrieval:
    """Retrieve deployment architecture documentation from the knowledge base."""

    def __init__(self) -> None:
        self._retriever = KnowledgeQueryService()

    def list_platforms(self) -> list[str]:
        return self._retriever.list_platforms()

    def resolve_target_platforms(
        self,
        *,
        platform_recommendation: dict[str, Any],
        platform_filter: str | None = None,
    ) -> list[str]:
        if platform_filter:
            return [platform_filter.lower()]

        platforms: list[str] = []
        primary = platform_recommendation.get("primary_platform")
        if primary:
            platforms.append(str(primary).lower())

        hybrid = platform_recommendation.get("hybrid_deployment") or {}
        if hybrid.get("recommended"):
            for comp in hybrid.get("components") or []:
                if isinstance(comp, dict) and comp.get("platform"):
                    platforms.append(str(comp["platform"]).lower())

        for alt in platform_recommendation.get("alternatives") or []:
            if isinstance(alt, dict) and alt.get("platform"):
                platforms.append(str(alt["platform"]).lower())

        seen: set[str] = set()
        unique: list[str] = []
        for platform in platforms:
            if platform and platform not in seen:
                seen.add(platform)
                unique.append(platform)
        return unique

    def build_retrieval_queries(
        self,
        *,
        repository_analysis: dict[str, Any],
        component_analysis: ComponentAnalysis,
        platform_recommendation: dict[str, Any],
        user_preferences: list[dict[str, str]],
    ) -> list[str]:
        scan = (repository_analysis or {}).get("facts") or repository_analysis or {}
        runtime = (scan.get("runtime") or {}).get("primary") or "application"
        commands = scan.get("commands") or {}

        queries = [
            f"Deploy {runtime} application architecture",
            "monorepo deployment multiple services",
            "environment variables configuration secrets",
            "health check endpoint deployment",
            "build command start command output directory",
            "background workers scheduled jobs cron",
            "database connection hosting persistent storage",
            "static assets CDN object storage",
            "WebSocket support real-time",
            "horizontal scaling autoscaling stateless",
            "custom domain SSL HTTPS routing",
            "CORS API configuration",
            "Docker container deployment",
            "zero downtime deployment rollback",
            "internal service communication",
        ]

        if commands.get("build"):
            queries.append(f"build command {commands['build']}")
        if commands.get("start"):
            queries.append(f"start command {commands['start']}")

        primary = platform_recommendation.get("primary_platform")
        if primary:
            queries.append(f"Deploy on {primary} architecture best practices")

        for comp in component_analysis.components:
            queries.append(f"Deploy {comp.type} {comp.name}")

        for entry in user_preferences:
            answer = entry.get("answer", "").strip()
            question = entry.get("question", "").strip()
            if answer and question:
                queries.append(f"{question} {answer}")

        facts = extract_known_facts_from_analysis(repository_analysis)
        for fact in facts[:5]:
            queries.append(fact)

        seen: set[str] = set()
        unique: list[str] = []
        for query in queries:
            normalized = query.lower().strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                unique.append(query)
        logger.info("Built %s architecture retrieval queries", len(unique))
        return unique[:24]

    def retrieve_platform_context(
        self,
        *,
        platform: str,
        queries: list[str],
        repository_analysis: dict[str, Any] | None = None,
        top_k: int = 4,
    ) -> tuple[str, list[RetrievedChunk]]:
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
            return f"No architecture documentation found for {platform}.", []

        chunks.sort(key=lambda item: item.score, reverse=True)
        return build_documentation_context(chunks[: top_k * 3]), chunks[: top_k * 3]

    def retrieve_for_platforms(
        self,
        *,
        platforms: list[str],
        queries: list[str],
        repository_analysis: dict[str, Any] | None = None,
    ) -> dict[str, tuple[str, list[RetrievedChunk]]]:
        output: dict[str, tuple[str, list[RetrievedChunk]]] = {}
        for platform in platforms:
            output[platform] = self.retrieve_platform_context(
                platform=platform,
                queries=queries,
                repository_analysis=repository_analysis,
            )
        return output
