"""Tests for platform selection confidence scoring."""

from __future__ import annotations

from cloudpilot.agents.platform_selection.confidence import (
    RECOMMENDATION_THRESHOLD,
    compute_interview_confidence,
    should_recommend,
)
from cloudpilot.agents.platform_selection.models import InterviewAnswer


def test_compute_interview_confidence_increases_with_answers() -> None:
    low = compute_interview_confidence(
        llm_confidence=0.4,
        answers=[],
        known_from_analysis_count=2,
    )
    high = compute_interview_confidence(
        llm_confidence=0.8,
        answers=[
            InterviewAnswer(
                question_id="budget",
                question="What is your budget?",
                answer="Under $25/month",
            ),
            InterviewAnswer(
                question_id="scaling",
                question="Do you need autoscaling?",
                answer="Yes, for production traffic",
            ),
        ],
        known_from_analysis_count=6,
    )
    assert high > low


def test_should_recommend_when_threshold_met() -> None:
    assert should_recommend(
        llm_ready=True,
        confidence=RECOMMENDATION_THRESHOLD,
        questions_asked=3,
    )


def test_should_recommend_at_max_questions() -> None:
    assert should_recommend(
        llm_ready=False,
        confidence=0.3,
        questions_asked=15,
    )
