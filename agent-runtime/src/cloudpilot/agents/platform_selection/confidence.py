"""Confidence scoring for the adaptive platform selection interview."""

from __future__ import annotations

from cloudpilot.agents.platform_selection.models import InterviewAnswer

# Deployment dimensions the agent may need to resolve via interview.
_CRITICAL_DIMENSIONS = frozenset(
    {
        "budget",
        "project_type",
        "scaling",
        "background_workers",
        "scheduled_jobs",
        "database_hosting",
        "persistent_storage",
        "custom_domain",
        "deployment_region",
        "docker_preference",
        "websockets",
        "gpu",
        "compliance",
        "team_collaboration",
        "zero_downtime",
    }
)

# Minimum confidence before recommending without further questions.
RECOMMENDATION_THRESHOLD = 0.75
MAX_INTERVIEW_QUESTIONS = 15


def extract_covered_dimensions(answers: list[InterviewAnswer]) -> set[str]:
    """Infer which deployment dimensions have been addressed from Q&A history."""
    covered: set[str] = set()
    for entry in answers:
        blob = f"{entry.question_id} {entry.question} {entry.answer}".lower()
        for dimension in _CRITICAL_DIMENSIONS:
            tokens = dimension.split("_")
            if dimension.replace("_", " ") in blob or all(token in blob for token in tokens):
                covered.add(dimension)
    return covered


def compute_interview_confidence(
    *,
    llm_confidence: float,
    answers: list[InterviewAnswer],
    known_from_analysis_count: int,
) -> float:
    """
    Blend LLM confidence with deterministic coverage signals.

    More answered dimensions and more repo-derived facts increase confidence.
    """
    covered = extract_covered_dimensions(answers)
    dimension_score = min(1.0, len(covered) / max(len(_CRITICAL_DIMENSIONS) * 0.45, 1))
    analysis_score = min(1.0, known_from_analysis_count / 8.0)
    answer_score = min(1.0, len(answers) / 6.0)

    blended = (
        llm_confidence * 0.55
        + dimension_score * 0.25
        + analysis_score * 0.10
        + answer_score * 0.10
    )
    return round(min(1.0, max(0.0, blended)), 3)


def should_recommend(
    *,
    llm_ready: bool,
    confidence: float,
    questions_asked: int,
) -> bool:
    """Decide whether the interview has gathered enough information."""
    if questions_asked >= MAX_INTERVIEW_QUESTIONS:
        return True
    if llm_ready and confidence >= RECOMMENDATION_THRESHOLD:
        return True
    if confidence >= 0.92 and questions_asked >= 2:
        return True
    return False
