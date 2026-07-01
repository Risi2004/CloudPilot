"""Deterministic component extraction from repository analysis."""

from __future__ import annotations

import logging
from typing import Any

from cloudpilot.agents.architecture.models import ComponentAnalysis, DetectedComponent

logger = logging.getLogger(__name__)


class ComponentAnalyzer:
    """Extract application components from repository scan facts."""

    def analyze(self, repository_analysis: dict[str, Any]) -> ComponentAnalysis:
        scan = (repository_analysis or {}).get("facts") or repository_analysis or {}
        components: list[DetectedComponent] = []

        frameworks = scan.get("frameworks") or {}
        for fw in frameworks.get("frontend") or []:
            components.append(
                DetectedComponent(
                    id=f"frontend-{str(fw).lower().replace(' ', '-')}",
                    name=str(fw),
                    type="frontend",
                    evidence=[f"Detected frontend framework: {fw}"],
                )
            )
        for fw in frameworks.get("backend") or []:
            components.append(
                DetectedComponent(
                    id=f"backend-{str(fw).lower().replace(' ', '-')}",
                    name=str(fw),
                    type="backend",
                    evidence=[f"Detected backend framework: {fw}"],
                )
            )

        runtime = (scan.get("runtime") or {}).get("primary")
        if runtime:
            components.append(
                DetectedComponent(
                    id="runtime",
                    name=str(runtime),
                    type="runtime",
                    evidence=[f"Primary runtime: {runtime}"],
                )
            )

        database = scan.get("database") or {}
        for idx, entry in enumerate(database.get("detected") or []):
            name = entry.get("name", entry) if isinstance(entry, dict) else str(entry)
            components.append(
                DetectedComponent(
                    id=f"database-{idx}",
                    name=str(name),
                    type="database",
                    evidence=[f"Detected database: {name}"],
                )
            )

        deployment = scan.get("deployment") or {}
        for platform in deployment.get("detected_platforms") or []:
            components.append(
                DetectedComponent(
                    id=f"platform-hint-{str(platform).lower()}",
                    name=str(platform),
                    type="deployment_hint",
                    evidence=[f"Existing deployment hint: {platform}"],
                )
            )

        architecture = scan.get("architecture") or {}
        if architecture.get("has_monorepo") or architecture.get("monorepo"):
            components.append(
                DetectedComponent(
                    id="monorepo",
                    name="Monorepo",
                    type="architecture",
                    evidence=["Monorepo structure detected"],
                )
            )

        containerization = scan.get("containerization") or {}
        if containerization.get("docker_detected") or containerization.get("has_dockerfile"):
            components.append(
                DetectedComponent(
                    id="docker",
                    name="Docker",
                    type="containerization",
                    evidence=["Dockerfile or containerization detected"],
                )
            )

        health = scan.get("health") or {}
        for issue in health.get("issues") or []:
            msg = issue.get("message", issue) if isinstance(issue, dict) else str(issue)
            if any(token in str(msg).lower() for token in ("worker", "queue", "cron", "websocket")):
                components.append(
                    DetectedComponent(
                        id=f"infra-{len(components)}",
                        name=str(msg)[:80],
                        type="infrastructure_hint",
                        evidence=[str(msg)],
                    )
                )

        commands = scan.get("commands") or {}
        if commands.get("build"):
            components.append(
                DetectedComponent(
                    id="build-process",
                    name="Build process",
                    type="build",
                    evidence=[f"Build command: {commands['build']}"],
                )
            )

        application_type = self._infer_application_type(components, scan)
        summary = self._build_summary(components, application_type)

        logger.info(
            "Component analysis complete",
            extra={"component_count": len(components), "application_type": application_type},
        )
        return ComponentAnalysis(
            components=components,
            application_type=application_type,
            summary=summary,
        )

    @staticmethod
    def _infer_application_type(components: list[DetectedComponent], scan: dict[str, Any]) -> str:
        types = {item.type for item in components}
        has_frontend = "frontend" in types
        has_backend = "backend" in types
        has_database = "database" in types

        if has_frontend and has_backend and has_database:
            return "full_stack_web_application"
        if has_frontend and has_backend:
            return "web_application"
        if has_backend and has_database:
            return "api_with_database"
        if has_backend:
            return "backend_api"
        if has_frontend:
            return "frontend_spa"
        if scan.get("repository", {}).get("primary_language"):
            return f"{scan['repository']['primary_language']}_application"
        return "unknown"

    @staticmethod
    def _build_summary(components: list[DetectedComponent], application_type: str) -> str:
        names = [f"{item.type}:{item.name}" for item in components[:8]]
        joined = ", ".join(names) if names else "no major components detected"
        return f"Application type {application_type}. Detected components: {joined}."
