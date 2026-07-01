"""Production Platform Selection service."""

from __future__ import annotations

import logging

from cloudpilot.agents.platform_selection.doc_retrieval import PlatformDocRetrieval
from cloudpilot.agents.platform_selection.interview import InterviewService
from cloudpilot.agents.platform_selection.models import PlatformSelectionRequest, PlatformSelectionResult
from cloudpilot.agents.platform_selection.platform_evaluation import PlatformEvaluationService
from cloudpilot.config import configure_runtime

logger = logging.getLogger(__name__)


class PlatformSelectionService:
    """
    Orchestrate adaptive interview and grounded platform recommendation.

    Combines repository analysis, user interview answers, and knowledge-base
    documentation retrieval without duplicating existing agent functionality.
    """

    def __init__(self) -> None:
        configure_runtime()
        self._doc_retrieval = PlatformDocRetrieval()
        self._interview = InterviewService()
        self._evaluation = PlatformEvaluationService()

    def run(self, request: PlatformSelectionRequest) -> PlatformSelectionResult:
        available_platforms = self._doc_retrieval.list_platforms()
        logger.info(
            "Platform selection step: %s answers, %s platforms in KB",
            len(request.interview_answers),
            len(available_platforms),
        )

        interview_result, ready = self._interview.run_interview_step(
            repository_analysis=request.repository_analysis,
            interview_answers=request.interview_answers,
            available_platforms=available_platforms,
        )

        if not ready:
            return interview_result

        logger.info(
            "Interview complete after %s questions; generating recommendation",
            len(request.interview_answers),
        )
        return self._evaluation.generate_recommendation(
            repository_analysis=request.repository_analysis,
            interview_answers=request.interview_answers,
            available_platforms=available_platforms,
        )
