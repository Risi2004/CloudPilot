"""Failure analysis using Documentation Agent and local Qwen."""

from __future__ import annotations

import logging

from cloudpilot.agents.deployment.models import DeployableServiceState, FailureAnalysisResult
from cloudpilot.agents.documentation.service import DocumentationQueryService
from cloudpilot.knowledge.models import DocumentationQueryRequest

logger = logging.getLogger(__name__)


class FailureAnalysisService:
    """Analyze deployment failures with grounded documentation retrieval."""

    def __init__(self) -> None:
        self._documentation = DocumentationQueryService()

    def analyze(
        self,
        *,
        platform: str,
        error_message: str,
        logs: str,
        repository_analysis: dict,
        failing_stage: str | None = None,
        service: DeployableServiceState | None = None,
    ) -> FailureAnalysisResult:
        service_label = service.name if service else "service"
        stage = failing_stage or "deployment"
        question = (
            f"How do I fix this {platform} deployment failure during {stage} for {service_label}? "
            f"Error: {error_message}. Recent logs excerpt: {logs[-1500:]}"
        )

        request = DocumentationQueryRequest(
            question=question,
            repository_analysis=repository_analysis,
            platform_filter=platform,
        )

        try:
            answer = self._documentation.query(request)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Documentation query failed during failure analysis: %s", exc)
            return FailureAnalysisResult(
                root_cause=error_message or "Deployment failed.",
                explanation=str(exc),
                suggested_fixes=[
                    "Review the deployment logs for the failing stage.",
                    "Verify build and start commands match the repository.",
                    "Confirm all required environment variables are set.",
                ],
                retry_recommended=True,
                insufficient_documentation=True,
            )

        fixes = []
        if answer.answer:
            for line in answer.answer.splitlines():
                stripped = line.strip(" -•\t")
                if stripped and len(stripped) > 10:
                    fixes.append(stripped)
        if not fixes:
            fixes = [
                "Review platform-specific build logs.",
                "Compare blueprint commands with repository scripts.",
            ]

        insufficient = any(
            marker in (answer.answer or "").lower()
            for marker in (
                "does not contain enough documentation",
                "insufficient documentation",
                "not enough documentation",
            )
        )

        return FailureAnalysisResult(
            root_cause=error_message or "Deployment failed.",
            explanation=answer.answer or "",
            suggested_fixes=fixes[:8],
            citations=answer.citations,
            retry_recommended=True,
            insufficient_documentation=insufficient,
        )
