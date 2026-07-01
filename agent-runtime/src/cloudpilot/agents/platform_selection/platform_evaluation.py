"""Platform evaluation and grounded recommendation generation."""

from __future__ import annotations

import json
import logging
from typing import Any

import litellm

from cloudpilot.agents.documentation.context_builder import (
    build_repository_context,
    citations_from_chunks,
)
from cloudpilot.agents.platform_selection.doc_retrieval import PlatformDocRetrieval
from cloudpilot.agents.platform_selection.models import (
    AlternativePlatform,
    ExpectedCosts,
    HybridComponent,
    HybridDeployment,
    InterviewAnswer,
    PlatformRecommendation,
    PlatformSelectionResult,
    coerce_string_list,
)
from cloudpilot.agents.platform_selection.prompt import (
    RECOMMENDATION_SYSTEM_INSTRUCTION,
    build_recommendation_prompt,
    format_user_requirements,
)
from cloudpilot.config import get_litellm_model_id
from cloudpilot.knowledge.models import Citation, RetrievedChunk

logger = logging.getLogger(__name__)


class PlatformEvaluationService:
    """Evaluate platforms using retrieved documentation and generate recommendations."""

    def __init__(self) -> None:
        self._doc_retrieval = PlatformDocRetrieval()

    def generate_recommendation(
        self,
        *,
        repository_analysis: dict[str, Any],
        interview_answers: list[InterviewAnswer],
        available_platforms: list[str],
    ) -> PlatformSelectionResult:
        if not available_platforms:
            return self._no_platforms_result(interview_answers)

        history = [
            {"id": item.question_id, "question": item.question, "answer": item.answer}
            for item in interview_answers
        ]
        queries = self._doc_retrieval.build_retrieval_queries(
            repository_analysis=repository_analysis,
            interview_answers=history,
        )

        platform_docs = self._doc_retrieval.retrieve_all_platforms(
            platforms=available_platforms,
            queries=queries,
            repository_analysis=repository_analysis,
        )

        doc_context = {platform: context for platform, (context, _) in platform_docs.items()}
        all_chunks: list[RetrievedChunk] = []
        for _, (_, chunks) in platform_docs.items():
            all_chunks.extend(chunks)

        platforms_with_docs = [
            platform
            for platform, (context, chunks) in platform_docs.items()
            if chunks and "No documentation found" not in context
        ]

        if not platforms_with_docs:
            return self._insufficient_docs_result(interview_answers, available_platforms)

        recommendation = self._call_recommendation_llm(
            repository_analysis=repository_analysis,
            interview_answers=interview_answers,
            platform_documentation={p: doc_context[p] for p in platforms_with_docs},
            available_platforms=platforms_with_docs,
            fallback_chunks=all_chunks,
        )

        return PlatformSelectionResult(
            status="complete",
            recommendation=recommendation,
            confidence=recommendation.confidence_score,
            questions_asked=len(interview_answers),
            interview_summary=interview_answers,
            platforms_evaluated=platforms_with_docs,
        )

    def _call_recommendation_llm(
        self,
        *,
        repository_analysis: dict[str, Any],
        interview_answers: list[InterviewAnswer],
        platform_documentation: dict[str, str],
        available_platforms: list[str],
        fallback_chunks: list[RetrievedChunk],
    ) -> PlatformRecommendation:
        repository_context = build_repository_context(repository_analysis)
        user_requirements = format_user_requirements(
            [
                {"question": item.question, "answer": item.answer}
                for item in interview_answers
            ]
        )
        prompt = build_recommendation_prompt(
            repository_context=repository_context,
            user_requirements=user_requirements,
            platform_documentation=platform_documentation,
            available_platforms=available_platforms,
        )
        model_id = get_litellm_model_id()

        try:
            response = litellm.completion(
                model=model_id,
                messages=[
                    {"role": "system", "content": RECOMMENDATION_SYSTEM_INSTRUCTION},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                timeout=1800,
            )
            content = response.choices[0].message.content or ""
            payload = json.loads(content)
            return self._parse_recommendation(payload, fallback_chunks)
        except Exception as exc:  # noqa: BLE001
            logger.error("Recommendation LLM call failed: %s", exc)
            return self._fallback_recommendation(
                available_platforms, fallback_chunks, str(exc)
            )

    def _parse_recommendation(
        self,
        payload: dict[str, Any],
        chunks: list[RetrievedChunk],
    ) -> PlatformRecommendation:
        citations_raw = payload.get("citations") or []
        citations: list[Citation] = []
        for item in citations_raw:
            if isinstance(item, dict):
                citations.append(Citation.model_validate(item))

        if not citations and chunks:
            citations = citations_from_chunks(chunks, limit=8)

        alternatives: list[AlternativePlatform] = []
        for item in payload.get("alternatives") or []:
            if isinstance(item, dict):
                alternatives.append(
                    AlternativePlatform(
                        platform=str(item.get("platform", "")),
                        fit_score=float(item.get("fit_score", 0.5)),
                        summary=str(item.get("summary", "")),
                        pros=coerce_string_list(item.get("pros")),
                        cons=coerce_string_list(item.get("cons")),
                    )
                )

        hybrid_raw = payload.get("hybrid_deployment") or {}
        components: list[HybridComponent] = []
        for comp in hybrid_raw.get("components") or []:
            if isinstance(comp, dict):
                components.append(
                    HybridComponent(
                        platform=str(comp.get("platform", "")),
                        role=str(comp.get("role", "")),
                        reason=str(comp.get("reason", "")),
                    )
                )

        costs_raw = payload.get("expected_costs") or {}
        expected_costs = ExpectedCosts(
            summary=str(costs_raw.get("summary", "")),
            estimate_range=costs_raw.get("estimate_range"),
            notes=coerce_string_list(costs_raw.get("notes")),
            grounded_in_documentation=bool(costs_raw.get("grounded_in_documentation", True)),
        )

        complexity = str(payload.get("deployment_complexity", "medium")).lower()
        if complexity not in {"low", "medium", "high"}:
            complexity = "medium"

        confidence = float(payload.get("confidence_score", 0.5))
        confidence = min(1.0, max(0.0, confidence))

        return PlatformRecommendation(
            primary_platform=str(payload.get("primary_platform", "unknown")),
            alternatives=alternatives,
            hybrid_deployment=HybridDeployment(
                recommended=bool(hybrid_raw.get("recommended")),
                description=str(hybrid_raw.get("description", "")),
                components=components,
            ),
            required_services=coerce_string_list(payload.get("required_services")),
            deployment_complexity=complexity,  # type: ignore[arg-type]
            configuration_steps=coerce_string_list(payload.get("configuration_steps")),
            build_commands=coerce_string_list(payload.get("build_commands")),
            runtime_requirements=coerce_string_list(payload.get("runtime_requirements")),
            environment_variables=coerce_string_list(payload.get("environment_variables")),
            limitations=coerce_string_list(payload.get("limitations")),
            expected_costs=expected_costs,
            confidence_score=confidence,
            explanation=str(payload.get("explanation", "")),
            citations=citations,
            documentation_gaps=coerce_string_list(payload.get("documentation_gaps")),
        )

    @staticmethod
    def _fallback_recommendation(
        platforms: list[str],
        chunks: list[RetrievedChunk],
        error: str,
    ) -> PlatformRecommendation:
        primary = platforms[0] if platforms else "unknown"
        top_chunks = chunks[:3]
        explanation = (
            f"Automated recommendation synthesis encountered an error ({error}). "
            f"Based on available documentation, {primary} has indexed deployment guidance. "
            "Review the citations and documentation gaps before proceeding."
        )
        return PlatformRecommendation(
            primary_platform=primary,
            alternatives=[
                AlternativePlatform(platform=p, fit_score=0.4, summary="Requires manual review")
                for p in platforms[1:3]
            ],
            explanation=explanation,
            confidence_score=0.35,
            citations=citations_from_chunks(top_chunks, limit=5),
            documentation_gaps=["Full recommendation synthesis failed; manual review recommended."],
            expected_costs=ExpectedCosts(
                summary="Cost data unavailable due to synthesis error.",
                grounded_in_documentation=False,
            ),
        )

    @staticmethod
    def _no_platforms_result(answers: list[InterviewAnswer]) -> PlatformSelectionResult:
        recommendation = PlatformRecommendation(
            primary_platform="none",
            explanation=(
                "No deployment platforms are indexed in the knowledge base. "
                "Add platform documentation and run a knowledge base sync before requesting recommendations."
            ),
            confidence_score=0.0,
            documentation_gaps=["No platforms indexed in ChromaDB knowledge base."],
            expected_costs=ExpectedCosts(
                summary="Unable to estimate costs without platform documentation.",
                grounded_in_documentation=False,
            ),
        )
        return PlatformSelectionResult(
            status="complete",
            recommendation=recommendation,
            confidence=0.0,
            questions_asked=len(answers),
            interview_summary=answers,
            platforms_evaluated=[],
        )

    @staticmethod
    def _insufficient_docs_result(
        answers: list[InterviewAnswer],
        platforms: list[str],
    ) -> PlatformSelectionResult:
        recommendation = PlatformRecommendation(
            primary_platform=platforms[0] if platforms else "none",
            explanation=(
                "Platforms exist in the knowledge base but insufficient documentation was retrieved "
                "to make a grounded recommendation. Sync additional platform documentation and retry."
            ),
            confidence_score=0.2,
            documentation_gaps=[
                f"Insufficient retrieved documentation for {platform}" for platform in platforms
            ],
            expected_costs=ExpectedCosts(
                summary="Cost estimation requires more documentation.",
                grounded_in_documentation=False,
            ),
        )
        return PlatformSelectionResult(
            status="complete",
            recommendation=recommendation,
            confidence=0.2,
            questions_asked=len(answers),
            interview_summary=answers,
            platforms_evaluated=platforms,
        )
