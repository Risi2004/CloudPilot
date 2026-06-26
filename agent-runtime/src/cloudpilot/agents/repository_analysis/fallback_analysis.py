"""Scan-derived narrative when LLM synthesis is unavailable."""

from __future__ import annotations

from cloudpilot.agents.repository_analysis.models import AnalysisNarrative
from cloudpilot.scanner.models import ScanResult


def build_fallback_analysis(facts: ScanResult) -> AnalysisNarrative:
    """Build a readable narrative from deterministic scan facts."""
    frameworks = [*facts.frameworks.frontend, *facts.frameworks.backend]
    languages = ", ".join(f"{lang.name} ({lang.file_count})" for lang in facts.repository.languages)
    platforms = ", ".join(facts.deployment.detected_platforms)
    health_issues = [issue.message for issue in facts.health.issues]
    missing_from_health = [
        msg for msg in health_issues if _looks_like_missing_config(msg)
    ]

    project_parts = [
        f"Repository: {facts.repository.name}",
        f"Files scanned: {facts.repository.file_count}",
    ]
    if languages:
        project_parts.append(f"Languages: {languages}")
    project_parts.append(
        f"Frameworks: {', '.join(frameworks)}" if frameworks else "No frameworks detected"
    )
    if facts.architecture.types:
        project_parts.append(f"Architecture: {', '.join(facts.architecture.types)}")

    stack_parts = []
    if facts.runtime.primary:
        stack_parts.append(f"Runtime: {facts.runtime.primary}")
    if facts.packageManager.primary:
        stack_parts.append(f"Package manager: {facts.packageManager.primary}")
    if frameworks:
        stack_parts.append(f"Frameworks: {', '.join(frameworks)}")
    if facts.dependencies.production:
        deps = facts.dependencies.production[:12]
        suffix = "…" if len(facts.dependencies.production) > 12 else ""
        stack_parts.append(f"Production dependencies: {', '.join(deps)}{suffix}")

    architecture_parts = []
    if facts.architecture.primary:
        architecture_parts.append(f"Primary: {facts.architecture.primary}")
    if facts.architecture.types:
        architecture_parts.append(f"Types: {', '.join(facts.architecture.types)}")
    if facts.architecture.structure.folders:
        architecture_parts.append(f"Folders: {', '.join(facts.architecture.structure.folders)}")

    readiness_parts = [
        f"Build: {facts.commands.build}" if facts.commands.build else "No build command detected",
        f"Start: {facts.commands.start}" if facts.commands.start else "No start command detected",
        "Dockerfile present" if facts.health.has_dockerfile else "No Dockerfile",
        "Env template present" if facts.health.has_env_template else "No env template",
        f"Platforms: {platforms}" if platforms else "No deployment platforms detected",
    ]

    strategy_parts = [
        f"Detected platforms: {platforms}" if platforms else "No platform-specific deployment files detected",
    ]
    if facts.commands.build:
        strategy_parts.append(f"Build with: {facts.commands.build}")
    if facts.commands.start:
        strategy_parts.append(f"Run with: {facts.commands.start}")
    if any(fw in {"react", "next.js", "vue", "angular"} for fw in frameworks):
        strategy_parts.append("Static or Node hosting may be appropriate for this frontend stack")

    return AnalysisNarrative(
        project_overview=". ".join(project_parts),
        technology_stack_summary=". ".join(stack_parts) or "Technology stack could not be summarized.",
        architecture_summary=". ".join(architecture_parts)
        or "Architecture could not be classified from scan facts.",
        deployment_readiness=". ".join(readiness_parts),
        missing_configuration_files=missing_from_health or [
            issue.message
            for issue in facts.health.issues
            if issue.severity == "info"
        ],
        potential_deployment_issues=health_issues,
        risks_before_deployment=[
            issue.message
            for issue in facts.health.issues
            if issue.severity in (None, "warning")
        ],
        recommended_deployment_strategy=". ".join(strategy_parts),
    )


def _looks_like_missing_config(message: str) -> bool:
    lowered = message.lower()
    return any(
        token in lowered
        for token in ("missing", "not found", "no dockerfile", "no env", "no start", "no build")
    )
