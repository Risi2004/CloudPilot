"""Tests for platform selection interview gap/dedupe logic."""

from cloudpilot.agents.platform_selection.interview import InterviewService
from cloudpilot.agents.platform_selection.models import InterviewAnswer, InterviewQuestion


def test_docker_gap_removed_after_answer() -> None:
    answers = [
        InterviewAnswer(
            question_id="q_1",
            question=(
                "To recommend the right platform, could you tell me about your "
                "Docker vs native deployment preference?"
            ),
            answer="Prefer native builds without Docker",
        ),
    ]
    gaps = InterviewService._default_gaps(["Node.js runtime"], answers)
    assert all("docker" not in gap.lower() for gap in gaps)


def test_gap_cover_is_case_insensitive() -> None:
    blob = "question about docker vs native deployment preference answer native"
    assert InterviewService._gap_already_covered(
        "Docker vs native deployment preference",
        blob,
    )


def test_duplicate_question_detected() -> None:
    answers = [
        InterviewAnswer(
            question_id="q_1",
            question=(
                "To recommend the right platform, could you tell me about your "
                "Docker vs native deployment preference?"
            ),
            answer="native",
        ),
    ]
    question = InterviewQuestion(
        id="q_2",
        text=(
            "To recommend the right platform, could you tell me about your "
            "Docker vs native deployment preference?"
        ),
    )
    assert InterviewService._is_duplicate_question(question, answers)


def test_fallback_skips_answered_docker_gap() -> None:
    answers = [
        InterviewAnswer(
            question_id="q_1",
            question=(
                "To recommend the right platform, could you tell me about your "
                "Docker vs native deployment preference?"
            ),
            answer="native",
        ),
    ]
    question = InterviewService._fallback_question(
        answers,
        ["Node.js"],
        [
            "Docker vs native deployment preference",
            "preferred deployment region",
        ],
    )
    assert "docker" not in question.text.lower()
    assert "region" in question.text.lower()
