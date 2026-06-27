"""Embedding generation via LiteLLM + local Ollama."""

from __future__ import annotations

import logging
import os
import time

import litellm

from cloudpilot.config.llm import configure_runtime
from cloudpilot.knowledge.config import KnowledgeSettings, load_knowledge_settings
from cloudpilot.knowledge.text_utils import sanitize_text_for_embedding

logger = logging.getLogger(__name__)

DEFAULT_EMBED_REQUEST_BATCH_SIZE = 2
DEFAULT_EMBED_MAX_RETRIES = 6
DEFAULT_EMBED_RETRY_BASE_DELAY_SEC = 3.0


class EmbeddingService:
    """Generate embeddings for document chunks and queries."""

    def __init__(self, settings: KnowledgeSettings | None = None) -> None:
        configure_runtime()
        self._settings = settings or load_knowledge_settings()
        os.environ["OLLAMA_API_BASE"] = self._settings.ollama_base_url
        litellm.suppress_debug_info = True
        self._request_batch_size = max(
            1,
            int(os.getenv("EMBEDDING_REQUEST_BATCH_SIZE", str(DEFAULT_EMBED_REQUEST_BATCH_SIZE))),
        )
        self._max_retries = max(
            1,
            int(os.getenv("EMBEDDING_MAX_RETRIES", str(DEFAULT_EMBED_MAX_RETRIES))),
        )
        self._retry_base_delay_sec = float(
            os.getenv("EMBEDDING_RETRY_BASE_DELAY_SEC", str(DEFAULT_EMBED_RETRY_BASE_DELAY_SEC))
        )
        self._inter_batch_delay_sec = float(os.getenv("EMBEDDING_INTER_BATCH_DELAY_SEC", "1.0"))

    @property
    def model_id(self) -> str:
        return self._settings.litellm_embedding_model_id

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts with sanitization, chunking, and retries."""
        if not texts:
            return []

        cleaned = [sanitize_text_for_embedding(text) for text in texts]
        embeddings: list[list[float]] = []

        for start in range(0, len(cleaned), self._request_batch_size):
            batch = cleaned[start : start + self._request_batch_size]
            embeddings.extend(self._embed_batch_with_retry(batch))
            if start + self._request_batch_size < len(cleaned) and self._inter_batch_delay_sec > 0:
                time.sleep(self._inter_batch_delay_sec)

        logger.debug("Generated %s embeddings with model %s", len(embeddings), self.model_id)
        return embeddings

    def _embed_batch_with_retry(self, batch: list[str]) -> list[list[float]]:
        last_error: Exception | None = None

        for attempt in range(1, self._max_retries + 1):
            try:
                return self._call_embedding_api(batch)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt >= self._max_retries:
                    break
                delay = self._retry_base_delay_sec * attempt
                logger.warning(
                    "Embedding batch failed (attempt %s/%s): %s; retrying in %.1fs",
                    attempt,
                    self._max_retries,
                    exc,
                )
                time.sleep(delay)

        assert last_error is not None
        if len(batch) > 1:
            midpoint = len(batch) // 2
            logger.warning(
                "Embedding batch of %s failed after retries; splitting into %s + %s",
                len(batch),
                midpoint,
                len(batch) - midpoint,
            )
            left = self._embed_batch_with_retry(batch[:midpoint])
            if self._inter_batch_delay_sec > 0:
                time.sleep(self._inter_batch_delay_sec)
            right = self._embed_batch_with_retry(batch[midpoint:])
            return left + right

        raise last_error

    def _call_embedding_api(self, batch: list[str]) -> list[list[float]]:
        response = litellm.embedding(model=self.model_id, input=batch)
        data = response.data if hasattr(response, "data") else response["data"]
        sorted_data = sorted(
            data,
            key=lambda item: item.get("index", 0) if isinstance(item, dict) else item.index,
        )
        embeddings: list[list[float]] = []
        for item in sorted_data:
            vector = item.get("embedding") if isinstance(item, dict) else item.embedding
            embeddings.append(list(vector))
        return embeddings

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query string."""
        return self.embed_texts([text])[0]
