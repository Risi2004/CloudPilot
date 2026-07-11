"""Adaptive interview logic for platform selection."""

from __future__ import annotations

import json
import logging
from typing import Any

import litellm

from cloudpilot.agents.documentation.context_builder import build_repository_context
from cloudpilot.agents.platform_selection.confidence import (
    MAX_INTERVIEW_QUESTIONS,
    RECOMMENDATION_THRESHOLD,
    compute_interview_confidence,
    should_recommend,
)
from cloudpilot.agents.platform_selection.models import (
    InterviewAnswer,
    InterviewQuestion,
    PlatformSelectionResult,
    _InterviewLLMOutput,
)
from cloudpilot.agents.platform_selection.prompt import (
    INTERVIEW_SYSTEM_INSTRUCTION,
    build_interview_prompt,
    extract_known_facts_from_analysis,
)
from cloudpilot.config import get_litellm_model_id

logger = logging.getLogger(__name__)


class InterviewService:
    """Conduct adaptive deployment requirement discovery."""

    def run_interview_step(
        self,
        *,
        repository_analysis: dict[str, Any],
        interview_answers: list[InterviewAnswer],
        available_platforms: list[str],
    ) -> tuple[PlatformSelectionResult, bool]:
        """
        Run one interview step.

        Returns:
            (result, ready_for_recommendation)
        """
        known_facts = extract_known_facts_from_analysis(repository_analysis)
        repository_context = build_repository_context(repository_analysis)

        history = [
            {"id": item.question_id, "question": item.question, "answer": item.answer}
            for item in interview_answers
        ]

        information_gaps = self._default_gaps(known_facts, interview_answers)

        llm_output = self._call_interview_llm(
            repository_context=repository_context,
            known_from_analysis=known_facts,
            interview_history=history,
            available_platforms=available_platforms,
            information_gaps=information_gaps,
        )

        confidence = compute_interview_confidence(
            llm_confidence=llm_output.confidence,
            answers=interview_answers,
            known_from_analysis_count=len(known_facts),
        )

        ready = should_recommend(
            llm_ready=llm_output.ready_to_recommend,
            confidence=confidence,
            questions_asked=len(interview_answers),
        )

        if ready:
            return (
                PlatformSelectionResult(
                    status="interview",
                    confidence=confidence,
                    questions_asked=len(interview_answers),
                    known_from_analysis=llm_output.known_from_analysis or known_facts,
                    information_gaps=llm_output.information_gaps,
                    interview_summary=interview_answers,
                ),
                True,
            )

        question = llm_output.question or self._fallback_question(
            interview_answers, known_facts, information_gaps
        )
        # LLM/fallback can repeat the same theme (e.g. Docker preference); force next gap.
        if self._is_duplicate_question(question, interview_answers):
            refreshed_gaps = [
                gap
                for gap in (llm_output.information_gaps or information_gaps)
                if not self._gap_already_covered(
                    gap,
                    " ".join(
                        f"{item.question_id} {item.question} {item.answer}"
                        for item in interview_answers
                    ).lower(),
                )
            ]
            if not refreshed_gaps:
                return (
                    PlatformSelectionResult(
                        status="interview",
                        confidence=max(confidence, RECOMMENDATION_THRESHOLD),
                        questions_asked=len(interview_answers),
                        known_from_analysis=llm_output.known_from_analysis or known_facts,
                        information_gaps=[],
                        interview_summary=interview_answers,
                    ),
                    True,
                )
            question = self._fallback_question(interview_answers, known_facts, refreshed_gaps)

        return (
            PlatformSelectionResult(
                status="interview",
                question=question,
                confidence=confidence,
                questions_asked=len(interview_answers),
                known_from_analysis=llm_output.known_from_analysis or known_facts,
                information_gaps=llm_output.information_gaps or information_gaps,
                interview_summary=interview_answers,
            ),
            False,
        )

    def _call_interview_llm(
        self,
        *,
        repository_context: str | None,
        known_from_analysis: list[str],
        interview_history: list[dict[str, str]],
        available_platforms: list[str],
        information_gaps: list[str],
    ) -> _InterviewLLMOutput:
        prompt = build_interview_prompt(
            repository_context=repository_context,
            known_from_analysis=known_from_analysis,
            interview_history=interview_history,
            available_platforms=available_platforms,
            information_gaps=information_gaps,
        )
        model_id = get_litellm_model_id()

        try:
            response = litellm.completion(
                model=model_id,
                messages=[
                    {"role": "system", "content": INTERVIEW_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
                timeout=1800,
            )
            content = response.choices[0].message.content or ""
            payload = json.loads(content)
            return _InterviewLLMOutput.model_validate(payload)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Interview LLM call failed, using fallback question: %s", exc)
            return _InterviewLLMOutput(
                ready_to_recommend=len(interview_history) >= MAX_INTERVIEW_QUESTIONS,
                confidence=min(0.5, len(interview_history) / MAX_INTERVIEW_QUESTIONS),
                reasoning="Fallback due to LLM error",
                question=self._fallback_question(
                    [
                        InterviewAnswer(
                            question_id=item["id"],
                            question=item["question"],
                            answer=item["answer"],
                        )
                        for item in interview_history
                    ],
                    known_from_analysis,
                    information_gaps,
                ),
                known_from_analysis=known_from_analysis,
                information_gaps=information_gaps,
            )

    @staticmethod
    def _default_gaps(
        known_facts: list[str],
        answers: list[InterviewAnswer],
    ) -> list[str]:
        gaps = [
            "monthly budget or free tier requirement",
            "project type (personal, startup, enterprise, production)",
            "scaling and traffic expectations",
            "background workers or scheduled jobs",
            "database and persistent storage needs",
            "custom domain and SSL requirements",
            "preferred deployment region",
            "Docker vs native deployment preference",
        ]
        answered_blob = " ".join(
            f"{item.question_id} {item.question} {item.answer}" for item in answers
        ).lower()
        remaining = [
            gap
            for gap in gaps
            if not InterviewService._gap_already_covered(gap, answered_blob)
        ]
        if not remaining:
            return ["deployment timeline and rollback requirements"]
        return remaining

    @staticmethod
    def _gap_already_covered(gap: str, answered_blob: str) -> bool:
        """Return True when prior Q&A already addressed this information gap."""
        gap_l = gap.lower()
        if gap_l in answered_blob:
            return True
        # Distinctive tokens (skip short/stop words). Match case-insensitively.
        stop = {"vs", "and", "or", "the", "your", "with", "for", "of", "a", "an"}
        tokens = [
            token.strip("(),")
            for token in gap_l.split()
            if len(token.strip("(),")) > 3 and token.strip("(),") not in stop
        ]
        if not tokens:
            return False
        hits = sum(1 for token in tokens if token in answered_blob)
        return hits >= max(2, (len(tokens) + 1) // 2)

    @staticmethod
    def _is_duplicate_question(
        question: InterviewQuestion,
        answers: list[InterviewAnswer],
    ) -> bool:
        text = (question.text or "").strip().lower()
        if not text:
            return False
        for item in answers:
            prev = (item.question or "").strip().lower()
            if not prev:
                continue
            if text == prev:
                return True
            if len(text) > 24 and (text in prev or prev in text):
                return True
        return False

    @staticmethod
    def _fallback_question(
        answers: list[InterviewAnswer],
        known_facts: list[str],
        information_gaps: list[str],
    ) -> InterviewQuestion:
        answered_blob = " ".join(
            f"{item.question_id} {item.question} {item.answer}" for item in answers
        ).lower()
        gap = next(
            (
                item
                for item in information_gaps
                if not InterviewService._gap_already_covered(item, answered_blob)
            ),
            None,
        )
        if gap is None:
            gap = "deployment timeline and rollback requirements"
        return InterviewQuestion(
            id=f"q_{len(answers) + 1}",
            text=f"To recommend the right platform, could you tell me about your {gap}?",
            answer_type="text",
            rationale="This helps narrow down suitable deployment platforms.",
            context=f"I already know: {', '.join(known_facts[:3])}" if known_facts else None,
        )
