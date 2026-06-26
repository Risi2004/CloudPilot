"""Production repository analysis service."""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import litellm
from pydantic import ValidationError

from cloudpilot.agents.repository_analysis.fallback_analysis import build_fallback_analysis
from cloudpilot.agents.repository_analysis.models import (
    AnalysisNarrative,
    RepositoryAnalysisResult,
    SourceMetadata,
)
from cloudpilot.agents.repository_analysis.prompt import build_analysis_prompt
from cloudpilot.agents.repository_analysis.utils.github_clone import clone_github_repository
from cloudpilot.agents.repository_analysis.utils.source_resolver import SourceKind, resolve_source
from cloudpilot.config import configure_runtime, get_litellm_model_id
from cloudpilot.scanner import RepositoryScanner
from cloudpilot.scanner.models import ScanResult

logger = logging.getLogger(__name__)

_MAX_LIST_ITEMS = 20


def _truncate_list(items: list[Any], limit: int = _MAX_LIST_ITEMS) -> list[Any]:
    if len(items) <= limit:
        return items
    return [*items[:limit], f"... and {len(items) - limit} more"]


def compact_facts_for_llm(facts: ScanResult) -> str:
    """
    Produce a smaller JSON payload for LLM synthesis without changing stored facts.

    Strips verbose evidence arrays and caps long file lists.
    """
    data = facts.model_dump()

    frameworks = data.get("frameworks") or {}
    for entry in frameworks.get("detected") or []:
        entry.pop("evidence", None)

    database = data.get("database") or {}
    for entry in database.get("detected") or []:
        entry.pop("evidence", None)

    repository = data.get("repository") or {}
    if "languages" in repository:
        repository["languages"] = _truncate_list(repository["languages"])

    dependencies = data.get("dependencies") or {}
    if "source_files" in dependencies:
        dependencies["source_files"] = _truncate_list(dependencies["source_files"])

    deployment = data.get("deployment") or {}
    if "files" in deployment:
        deployment["files"] = _truncate_list(deployment["files"])

    environment = data.get("environment") or {}
    if "variables" in environment:
        environment["variables"] = _truncate_list(environment["variables"])

    return json.dumps(data, separators=(",", ":"))


class RepositoryAnalysisService:
    """Deterministic scan pipeline with a single LLM synthesis step."""

    def analyze(self, source: str) -> RepositoryAnalysisResult:
        """
        Analyze a GitHub URL or local repository path.

        Args:
            source: GitHub repository URL or local filesystem path.

        Returns:
            Structured facts plus LLM-generated narrative analysis.
        """
        configure_runtime()
        resolved = resolve_source(source)

        clone_method: str | None = None
        default_branch: str | None = None

        if resolved.kind == SourceKind.GITHUB_URL:
            clone = clone_github_repository(resolved)
            repo_path = clone.repo_path
            clone_method = clone.clone_method
            default_branch = clone.default_branch
        else:
            repo_path = str(Path(resolved.value).resolve())

        scan_started = time.perf_counter()
        logger.info("Running repository scan on %s", repo_path, extra={"repo_path": repo_path})
        facts = RepositoryScanner().scan(repo_path)
        scan_duration_ms = int((time.perf_counter() - scan_started) * 1000)

        compact_json = compact_facts_for_llm(facts)
        full_json = facts.model_dump_json()
        logger.info(
            "scan_facts_ready",
            extra={
                "repo_path": repo_path,
                "scan_duration_ms": scan_duration_ms,
                "facts_bytes_full": len(full_json.encode("utf-8")),
                "facts_bytes_compact": len(compact_json.encode("utf-8")),
            },
        )

        llm_started = time.perf_counter()
        try:
            analysis = self._generate_analysis(compact_json)
        except RuntimeError as exc:
            logger.warning(
                "LLM synthesis failed; returning scan-derived narrative fallback",
                extra={"repo_path": repo_path, "error": str(exc)},
            )
            analysis = build_fallback_analysis(facts)
        llm_duration_ms = int((time.perf_counter() - llm_started) * 1000)
        logger.info(
            "analysis_complete",
            extra={"repo_path": repo_path, "llm_duration_ms": llm_duration_ms},
        )

        return RepositoryAnalysisResult(
            facts=facts,
            analysis=analysis,
            source=SourceMetadata(
                input=source,
                kind=resolved.kind.value,
                repo_path=repo_path,
                clone_method=clone_method,
                default_branch=default_branch,
                scanned_at=datetime.now(timezone.utc),
            ),
        )

    def _generate_analysis(self, facts_json: str) -> AnalysisNarrative:
        """Generate narrative analysis from scan facts using the shared Qwen model."""
        prompt = build_analysis_prompt(facts_json)
        model_id = get_litellm_model_id()

        logger.info(
            "Generating repository analysis narrative",
            extra={"model_id": model_id, "facts_bytes": len(facts_json.encode("utf-8"))},
        )

        last_error: Exception | None = None
        for attempt in range(2):
            try:
                response = litellm.completion(
                    model=model_id,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are CloudPilot's Repository Analysis Agent. "
                                "Respond with valid JSON only. "
                                "Narrative fields must be plain strings, not nested JSON objects."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                    timeout=1800,
                )
                content = response.choices[0].message.content or ""
                if not content.strip():
                    raise ValueError("Model returned empty content.")
                payload = json.loads(content)
                return AnalysisNarrative.model_validate(payload)
            except json.JSONDecodeError as exc:
                last_error = exc
                logger.warning(
                    "Model returned invalid JSON on attempt %s",
                    attempt + 1,
                    extra={"attempt": attempt + 1, "error": str(exc)},
                )
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt == 0 and _is_retryable_llm_error(exc):
                    logger.warning(
                        "LLM call failed on attempt %s, retrying",
                        attempt + 1,
                        extra={"attempt": attempt + 1, "error": str(exc)},
                    )
                    continue
                raise RuntimeError(
                    f"Repository analysis model call failed: {exc}"
                ) from exc

        logger.error("Model returned invalid JSON after retry")
        raise RuntimeError("Repository analysis model returned invalid JSON.") from last_error


def _is_retryable_llm_error(exc: Exception) -> bool:
    if isinstance(exc, (json.JSONDecodeError, ValueError, ValidationError)):
        return True
    message = str(exc).lower()
    return any(token in message for token in ("timeout", "connection", "503", "502", "429"))
