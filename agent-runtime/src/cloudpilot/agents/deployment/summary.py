"""Pre-deployment summary generation."""

from __future__ import annotations

from cloudpilot.agents.architecture.models import DeploymentBlueprint
from cloudpilot.agents.deployment.models import DeploymentSummary, ServiceSummaryItem


class SummaryGenerator:
    """Build a human-readable deployment summary before confirmation."""

    def generate(
        self,
        *,
        blueprint: DeploymentBlueprint,
        source_url: str,
        branch: str,
    ) -> DeploymentSummary:
        services = [
            ServiceSummaryItem(
                service_id=service.id,
                name=service.name or service.id,
                platform=service.platform,
                build_command=service.build_command,
                start_command=service.start_command,
                runtime_version=service.runtime_version,
                environment_variables=list(
                    dict.fromkeys(service.environment_variables + service.required_secrets),
                ),
            )
            for service in blueprint.deployable_services
        ]

        platforms = sorted({service.platform for service in blueprint.deployable_services if service.platform})
        deployment_order = [
            step.service_id
            for step in sorted(blueprint.deployment_sequence, key=lambda item: item.order)
            if step.service_id
        ]
        if not deployment_order:
            deployment_order = [service.id for service in blueprint.deployable_services]

        env_names: list[str] = []
        for service in blueprint.deployable_services:
            env_names.extend(service.environment_variables)
            env_names.extend(service.required_secrets)
        for item in blueprint.environment_plan:
            env_names.append(item.variable)
        env_names = sorted(dict.fromkeys(name for name in env_names if name))

        complexity = self._estimate_complexity(blueprint, platforms, env_names)
        duration = self._estimate_duration(blueprint, complexity)
        risks = [
            risk.risk for risk in blueprint.architectural_risks[:5] if risk.risk
        ]
        if blueprint.documentation_gaps:
            risks.extend([f"Documentation gap: {gap}" for gap in blueprint.documentation_gaps[:3]])

        return DeploymentSummary(
            repository=source_url,
            branch=branch,
            platforms=platforms,
            services=services,
            deployment_order=deployment_order,
            environment_variables=env_names,
            complexity=complexity,
            estimated_duration_minutes=duration,
            potential_risks=risks,
        )

    def _estimate_complexity(
        self,
        blueprint: DeploymentBlueprint,
        platforms: list[str],
        env_names: list[str],
    ) -> str:
        score = len(blueprint.deployable_services)
        score += len(platforms) - 1
        score += len(env_names) // 3
        score += len(blueprint.service_dependencies)
        if score <= 2:
            return "low"
        if score <= 5:
            return "medium"
        return "high"

    def _estimate_duration(self, blueprint: DeploymentBlueprint, complexity: str) -> int:
        base = {"low": 3, "medium": 8, "high": 15}[complexity]
        return base + len(blueprint.deployable_services) * 2
