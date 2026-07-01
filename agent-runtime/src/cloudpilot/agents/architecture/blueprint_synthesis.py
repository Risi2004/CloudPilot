"""Blueprint synthesis via local Qwen with grounded documentation."""

from __future__ import annotations

import json
import logging
from typing import Any

import litellm

from cloudpilot.agents.architecture.doc_retrieval import ArchitectureDocRetrieval
from cloudpilot.agents.architecture.models import (
    ArchitecturalRisk,
    ComponentAnalysis,
    DeployableService,
    DeploymentBlueprint,
    DeploymentSequenceStep,
    EnvironmentPlanItem,
    NetworkingPlan,
    PlatformAssignmentItem,
    ScalingRecommendation,
    ServiceDependency,
    ServiceInventoryItem,
    coerce_string_list,
)
from cloudpilot.agents.documentation.context_builder import (
    build_repository_context,
    citations_from_chunks,
)
from cloudpilot.agents.architecture.prompt import (
    BLUEPRINT_SYSTEM_INSTRUCTION,
    build_blueprint_prompt,
    format_preferences_from_models,
)
from cloudpilot.config import get_litellm_model_id
from cloudpilot.knowledge.models import Citation, RetrievedChunk

logger = logging.getLogger(__name__)


class BlueprintSynthesisService:
    """Synthesize a deployment blueprint from analysis, platform selection, and docs."""

    def __init__(self) -> None:
        self._doc_retrieval = ArchitectureDocRetrieval()

    def generate(
        self,
        *,
        repository_analysis: dict[str, Any],
        component_analysis: ComponentAnalysis,
        platform_recommendation: dict[str, Any],
        user_preferences: list[Any],
        platform_filter: str | None = None,
    ) -> tuple[DeploymentBlueprint, list[str]]:
        target_platforms = self._doc_retrieval.resolve_target_platforms(
            platform_recommendation=platform_recommendation,
            platform_filter=platform_filter,
        )
        if not target_platforms:
            target_platforms = self._doc_retrieval.list_platforms()

        pref_dicts = [
            {"question": p.question, "answer": p.answer}
            if hasattr(p, "question")
            else {"question": p.get("question", ""), "answer": p.get("answer", "")}
            for p in user_preferences
        ]

        queries = self._doc_retrieval.build_retrieval_queries(
            repository_analysis=repository_analysis,
            component_analysis=component_analysis,
            platform_recommendation=platform_recommendation,
            user_preferences=pref_dicts,
        )

        platform_docs = self._doc_retrieval.retrieve_for_platforms(
            platforms=target_platforms,
            queries=queries,
            repository_analysis=repository_analysis,
        )

        doc_context = {p: ctx for p, (ctx, _) in platform_docs.items()}
        all_chunks: list[RetrievedChunk] = []
        for _, (_, chunks) in platform_docs.items():
            all_chunks.extend(chunks)

        repository_context = build_repository_context(repository_analysis)
        user_requirements = format_preferences_from_models(user_preferences)

        try:
            blueprint = self._call_blueprint_llm(
                repository_context=repository_context,
                component_analysis=component_analysis,
                platform_recommendation=platform_recommendation,
                user_requirements=user_requirements,
                platform_documentation=doc_context,
                target_platforms=target_platforms,
                fallback_chunks=all_chunks,
            )
            return blueprint, target_platforms
        except Exception as exc:  # noqa: BLE001
            logger.error("Blueprint synthesis failed: %s", exc)
            return (
                self._fallback_blueprint(
                    component_analysis=component_analysis,
                    platform_recommendation=platform_recommendation,
                    repository_analysis=repository_analysis,
                    chunks=all_chunks,
                    error=str(exc),
                ),
                target_platforms,
            )

    def _call_blueprint_llm(
        self,
        *,
        repository_context: str | None,
        component_analysis: ComponentAnalysis,
        platform_recommendation: dict[str, Any],
        user_requirements: str,
        platform_documentation: dict[str, str],
        target_platforms: list[str],
        fallback_chunks: list[RetrievedChunk],
    ) -> DeploymentBlueprint:
        prompt = build_blueprint_prompt(
            repository_context=repository_context,
            component_analysis=component_analysis,
            platform_recommendation=platform_recommendation,
            user_requirements=user_requirements,
            platform_documentation=platform_documentation,
            target_platforms=target_platforms,
        )
        model_id = get_litellm_model_id()

        response = litellm.completion(
            model=model_id,
            messages=[
                {"role": "system", "content": BLUEPRINT_SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            timeout=1800,
        )
        content = response.choices[0].message.content or ""
        payload = json.loads(content)
        return self._parse_blueprint(payload, fallback_chunks)

    def _parse_blueprint(
        self,
        payload: dict[str, Any],
        chunks: list[RetrievedChunk],
    ) -> DeploymentBlueprint:
        citations_raw = payload.get("citations") or []
        citations: list[Citation] = []
        for item in citations_raw:
            if isinstance(item, dict):
                citations.append(Citation.model_validate(item))
        if not citations and chunks:
            citations = citations_from_chunks(chunks, limit=8)

        inventory: list[ServiceInventoryItem] = []
        for item in payload.get("service_inventory") or []:
            if isinstance(item, dict):
                inventory.append(ServiceInventoryItem.model_validate(item))

        deployable: list[DeployableService] = []
        for item in payload.get("deployable_services") or []:
            if isinstance(item, dict):
                deployable.append(DeployableService.model_validate(item))

        sequence: list[DeploymentSequenceStep] = []
        for item in payload.get("deployment_sequence") or []:
            if isinstance(item, dict):
                sequence.append(DeploymentSequenceStep.model_validate(item))

        dependencies: list[ServiceDependency] = []
        for item in payload.get("service_dependencies") or []:
            if isinstance(item, dict):
                dependencies.append(ServiceDependency.model_validate(item))

        env_plan: list[EnvironmentPlanItem] = []
        for item in payload.get("environment_plan") or []:
            if isinstance(item, dict):
                env_plan.append(EnvironmentPlanItem.model_validate(item))

        networking_raw = payload.get("networking") or {}
        networking = NetworkingPlan.model_validate(networking_raw) if networking_raw else NetworkingPlan()

        scaling: list[ScalingRecommendation] = []
        for item in payload.get("scaling_recommendations") or []:
            if isinstance(item, dict):
                scaling.append(ScalingRecommendation.model_validate(item))

        risks: list[ArchitecturalRisk] = []
        for item in payload.get("architectural_risks") or []:
            if isinstance(item, dict):
                risks.append(ArchitecturalRisk.model_validate(item))

        assignment: list[PlatformAssignmentItem] = []
        for item in payload.get("platform_assignment") or []:
            if isinstance(item, dict):
                assignment.append(PlatformAssignmentItem.model_validate(item))

        confidence = float(payload.get("confidence_score", 0.5))
        confidence = min(1.0, max(0.0, confidence))

        return DeploymentBlueprint(
            overall_summary=str(payload.get("overall_summary", "")),
            application_type=str(payload.get("application_type", "unknown")),
            confidence_score=confidence,
            service_inventory=inventory,
            deployable_services=deployable,
            deployment_sequence=sequence,
            service_dependencies=dependencies,
            environment_plan=env_plan,
            networking=networking,
            scaling_recommendations=scaling,
            infrastructure_requirements=coerce_string_list(payload.get("infrastructure_requirements")),
            architectural_risks=risks,
            platform_assignment=assignment,
            citations=citations,
            documentation_gaps=coerce_string_list(payload.get("documentation_gaps")),
        )

    @staticmethod
    def _fallback_blueprint(
        *,
        component_analysis: ComponentAnalysis,
        platform_recommendation: dict[str, Any],
        repository_analysis: dict[str, Any],
        chunks: list[RetrievedChunk],
        error: str,
    ) -> DeploymentBlueprint:
        primary = str(platform_recommendation.get("primary_platform", "unknown"))
        scan = (repository_analysis or {}).get("facts") or repository_analysis or {}
        commands = scan.get("commands") or {}

        inventory = [
            ServiceInventoryItem(
                id=comp.id,
                name=comp.name,
                type=comp.type,
                platform=primary,
                role=comp.type,
                description=", ".join(comp.evidence),
            )
            for comp in component_analysis.components[:8]
        ]

        deployable = [
            DeployableService(
                id=comp.id,
                name=comp.name,
                platform=primary,
                build_command=commands.get("build", ""),
                start_command=commands.get("start", ""),
                runtime_version=(scan.get("runtime") or {}).get("primary", ""),
            )
            for comp in component_analysis.components
            if comp.type in {"frontend", "backend", "api"}
        ]

        return DeploymentBlueprint(
            overall_summary=(
                f"Fallback blueprint generated due to synthesis error ({error}). "
                f"Platform selection recommends {primary}. Review citations and gaps before deployment."
            ),
            application_type=component_analysis.application_type,
            confidence_score=0.35,
            service_inventory=inventory,
            deployable_services=deployable,
            platform_assignment=[
                PlatformAssignmentItem(service_id=item.id, platform=primary, reason="Fallback assignment")
                for item in inventory
            ],
            citations=citations_from_chunks(chunks, limit=5),
            documentation_gaps=["Full blueprint synthesis failed; manual architecture review recommended."],
            architectural_risks=[
                ArchitecturalRisk(
                    risk="Incomplete automated blueprint",
                    severity="high",
                    explanation=str(error),
                    recommendation="Regenerate after verifying Ollama and documentation sync.",
                )
            ],
        )
