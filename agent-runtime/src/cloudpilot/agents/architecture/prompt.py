"""Prompt templates for the Architecture Agent."""

from __future__ import annotations

import json
from typing import Any

from cloudpilot.agents.architecture.models import ComponentAnalysis
from cloudpilot.agents.platform_selection.prompt import format_user_requirements

BLUEPRINT_SYSTEM_INSTRUCTION = """
You are CloudPilot's Architecture Agent — an experienced Cloud Solution Architect.

Your job is to produce a complete, deployment-ready architecture blueprint from:
- Repository analysis
- Platform selection recommendation
- User deployment preferences
- Retrieved official platform documentation

Rules:
- Ground architecture decisions in repository facts and retrieved documentation.
- Never invent platform capabilities not supported by documentation.
- Never expose secret values — only identify required variable/secret names.
- Support hybrid deployments when platform selection recommends them.
- Produce machine-readable JSON suitable for a future Deployment Agent.
- Return valid JSON only.
""".strip()


def build_blueprint_prompt(
    *,
    repository_context: str | None,
    component_analysis: ComponentAnalysis,
    platform_recommendation: dict[str, Any],
    user_requirements: str,
    platform_documentation: dict[str, str],
    target_platforms: list[str],
) -> str:
    doc_sections = []
    for platform, context in platform_documentation.items():
        doc_sections.append(f"=== {platform.upper()} DOCUMENTATION ===\n{context}")

    components_json = json.dumps(
        [item.model_dump() for item in component_analysis.components],
        indent=2,
    )

    return f"""
Repository analysis context:
{repository_context or "No repository context available."}

Deterministic component analysis:
Application type: {component_analysis.application_type}
Summary: {component_analysis.summary}
Components:
{components_json}

Platform selection recommendation:
{json.dumps(platform_recommendation, indent=2)}

User deployment preferences:
{user_requirements}

Target platforms:
{json.dumps(target_platforms)}

Retrieved official documentation (ONLY source of truth for platform capabilities):
{chr(10).join(doc_sections) if doc_sections else "No documentation retrieved."}

Generate a Deployment Blueprint grounded in the inputs above.

Return JSON with this exact shape:
{{
  "overall_summary": "architecture overview",
  "application_type": "e.g. full_stack_web_application",
  "confidence_score": 0.0-1.0,
  "service_inventory": [
    {{"id": "frontend", "name": "React App", "type": "frontend", "platform": "vercel", "role": "ui", "description": "..."}}
  ],
  "deployable_services": [
    {{
      "id": "api",
      "name": "Express API",
      "platform": "render",
      "build_command": "npm run build",
      "start_command": "npm start",
      "runtime_version": "node 20",
      "root_directory": ".",
      "output_directory": "dist",
      "environment_variables": ["PORT", "DATABASE_URL"],
      "required_secrets": ["JWT_SECRET"],
      "health_check_path": "/health",
      "public_url_placeholder": "https://api.example.com"
    }}
  ],
  "deployment_sequence": [
    {{"order": 1, "service_id": "database", "action": "provision", "notes": "..."}}
  ],
  "service_dependencies": [
    {{"from": "frontend", "to": "api", "type": "http", "description": "..."}}
  ],
  "environment_plan": [
    {{"variable": "DATABASE_URL", "scope": "backend", "service_ids": ["api"], "description": "..."}}
  ],
  "networking": {{
    "public_endpoints": ["https://app.example.com"],
    "internal_endpoints": [],
    "cors_notes": "...",
    "domain_structure": "..."
  }},
  "scaling_recommendations": [
    {{"service_id": "api", "strategy": "horizontal", "explanation": "..."}}
  ],
  "infrastructure_requirements": ["Docker", "persistent storage"],
  "architectural_risks": [
    {{"risk": "missing health check", "severity": "medium", "explanation": "...", "recommendation": "..."}}
  ],
  "platform_assignment": [
    {{"service_id": "frontend", "platform": "vercel", "reason": "..."}}
  ],
  "citations": [
    {{"source_file": "...", "relative_path": "...", "platform": "...", "heading": "...", "excerpt": "..."}}
  ],
  "documentation_gaps": ["..."]
}}

Assign each service to a platform from the platform selection recommendation.
Use build/start commands from repository analysis when available.
""".strip()


def format_preferences_from_models(preferences: list[Any]) -> str:
    if not preferences:
        return "No explicit user preferences collected."
    return format_user_requirements(
        [
            {"question": item.question, "answer": item.answer}
            if hasattr(item, "question")
            else {"question": item.get("question", ""), "answer": item.get("answer", "")}
            for item in preferences
        ]
    )
