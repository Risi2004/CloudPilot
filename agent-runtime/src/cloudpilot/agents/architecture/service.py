"""Production Architecture Agent service."""

from __future__ import annotations

import logging

from cloudpilot.agents.architecture.blueprint_synthesis import BlueprintSynthesisService
from cloudpilot.agents.architecture.component_analyzer import ComponentAnalyzer
from cloudpilot.agents.architecture.models import ArchitectureRequest, ArchitectureResult
from cloudpilot.config import configure_runtime

logger = logging.getLogger(__name__)


class ArchitectureService:
    """
    Orchestrate component analysis, documentation retrieval, and blueprint synthesis.

    Consumes repository analysis and platform selection outputs without re-running
    those agents.
    """

    def __init__(self) -> None:
        configure_runtime()
        self._component_analyzer = ComponentAnalyzer()
        self._blueprint_synthesis = BlueprintSynthesisService()

    def run(self, request: ArchitectureRequest) -> ArchitectureResult:
        logger.info("Starting architecture blueprint generation")

        component_analysis = self._component_analyzer.analyze(request.repository_analysis)
        logger.info(
            "Component analysis ready",
            extra={
                "application_type": component_analysis.application_type,
                "components": len(component_analysis.components),
            },
        )

        blueprint, platforms = self._blueprint_synthesis.generate(
            repository_analysis=request.repository_analysis,
            component_analysis=component_analysis,
            platform_recommendation=request.platform_recommendation,
            user_preferences=request.user_preferences,
            platform_filter=request.platform_filter,
        )

        logger.info(
            "Architecture blueprint complete",
            extra={
                "confidence": blueprint.confidence_score,
                "services": len(blueprint.deployable_services),
                "platforms": platforms,
            },
        )

        return ArchitectureResult(
            blueprint=blueprint,
            component_analysis=component_analysis,
            platforms_evaluated=platforms,
        )
