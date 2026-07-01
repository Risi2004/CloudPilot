"""Semantic retrieval service for documentation queries."""

from __future__ import annotations

import logging
from typing import Any

from cloudpilot.knowledge.config import load_knowledge_settings
from cloudpilot.knowledge.embeddings import EmbeddingService
from cloudpilot.knowledge.models import DocumentationQueryRequest, RetrievedChunk
from cloudpilot.knowledge.vector.factory import get_vector_store

logger = logging.getLogger(__name__)


class KnowledgeQueryService:
    """Retrieve relevant documentation chunks for agents."""

    def __init__(self) -> None:
        self._settings = load_knowledge_settings()
        self._embedder = EmbeddingService(self._settings)
        self._vector_store = get_vector_store()

    def retrieve(
        self,
        question: str,
        *,
        repository_analysis: dict[str, Any] | None = None,
        platform_filter: str | None = None,
        top_k: int | None = None,
    ) -> list[RetrievedChunk]:
        """Perform semantic retrieval with optional platform biasing."""
        limit = top_k or self._settings.top_k
        platform = platform_filter or self._infer_platform(repository_analysis)

        query_embedding = self._embedder.embed_query(question)
        results = self._vector_store.search(query_embedding, top_k=limit, platform=platform)

        if platform and len(results) < limit:
            fallback = self._vector_store.search(query_embedding, top_k=limit)
            seen = {item.chunk_id for item in results}
            for item in fallback:
                if item.chunk_id not in seen:
                    results.append(item)
                    seen.add(item.chunk_id)
                if len(results) >= limit:
                    break

        chunks = [item.to_retrieved_chunk() for item in results]
        logger.info(
            "Retrieved %s chunks for query",
            len(chunks),
            extra={"platform_filter": platform, "top_k": limit},
        )
        return chunks

    def retrieve_from_request(self, request: DocumentationQueryRequest) -> list[RetrievedChunk]:
        return self.retrieve(
            request.question,
            repository_analysis=request.repository_analysis,
            platform_filter=request.platform_filter,
            top_k=request.top_k,
        )

    def count_vectors(self) -> int:
        return self._vector_store.count()

    def list_platforms(self) -> list[str]:
        """Return deployment platforms available in the knowledge base."""
        return self._vector_store.list_platforms()

    @staticmethod
    def _infer_platform(repository_analysis: dict[str, Any] | None) -> str | None:
        if not repository_analysis:
            return None

        facts = repository_analysis.get("facts") or repository_analysis
        deployment = facts.get("deployment") or {}
        platforms = deployment.get("detected_platforms") or []
        if platforms:
            return str(platforms[0]).lower()

        deployment_files = deployment.get("files") or []
        for file_entry in deployment_files:
            path = str(file_entry.get("path", "")).lower()
            if "vercel" in path:
                return "vercel"
            if "render" in path:
                return "render"
            if "railway" in path:
                return "railway"
            if "netlify" in path:
                return "netlify"
        return None
