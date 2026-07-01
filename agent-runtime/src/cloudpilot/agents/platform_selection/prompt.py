"""Prompt templates for the Platform Selection Agent."""

from __future__ import annotations

import json
from typing import Any

INTERVIEW_SYSTEM_INSTRUCTION = """
You are CloudPilot's Platform Selection Agent conducting an adaptive deployment interview.

Your job is to understand the user's deployment goals before recommending a hosting platform.

Rules:
- Do NOT ask about technology stack details already present in the repository analysis.
- Ask only ONE question per turn that most reduces uncertainty.
- Keep questions conversational and specific to this project.
- Prefer choice-based questions when a small set of answers is natural.
- Stop asking when you have enough information to recommend confidently.
- Never recommend a platform during the interview phase.
- Return valid JSON only.
""".strip()

RECOMMENDATION_SYSTEM_INSTRUCTION = """
You are CloudPilot's Platform Selection Agent recommending a deployment platform.

Rules:
- Ground EVERY platform capability, limitation, and cost claim in the provided documentation.
- Never invent features, pricing, or configuration steps not supported by documentation.
- If documentation is insufficient for a claim, add it to documentation_gaps.
- Evaluate only platforms present in the knowledge base documentation.
- Consider hybrid deployments when different components suit different platforms.
- Return valid JSON only.
""".strip()


def build_interview_prompt(
    *,
    repository_context: str | None,
    known_from_analysis: list[str],
    interview_history: list[dict[str, str]],
    available_platforms: list[str],
    information_gaps: list[str],
) -> str:
    history_text = "None yet."
    if interview_history:
        lines = []
        for item in interview_history:
            lines.append(f"Q ({item['id']}): {item['question']}")
            lines.append(f"A: {item['answer']}")
        history_text = "\n".join(lines)

    return f"""
Repository analysis context:
{repository_context or "No repository context available."}

Facts already known from repository analysis (do NOT re-ask these):
{json.dumps(known_from_analysis, indent=2)}

Available deployment platforms in knowledge base:
{json.dumps(available_platforms)}

Current information gaps to resolve:
{json.dumps(information_gaps)}

Interview history so far:
{history_text}

Decide whether you have enough information to recommend a deployment platform.

Return JSON with this exact shape:
{{
  "ready_to_recommend": boolean,
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of confidence level",
  "question": {{
    "id": "snake_case_id",
    "text": "conversational question for the user",
    "answer_type": "text|choice|boolean|multi_choice",
    "choices": ["option1", "option2"],
    "rationale": "why this question matters",
    "context": "optional brief context referencing the project"
  }} or null when ready_to_recommend is true,
  "known_from_analysis": ["fact1", "fact2"],
  "information_gaps": ["gap1", "gap2"]
}}

If ready_to_recommend is false, question must be non-null and ask exactly ONE new thing.
If ready_to_recommend is true, set question to null.
""".strip()


def build_recommendation_prompt(
    *,
    repository_context: str | None,
    user_requirements: str,
    platform_documentation: dict[str, str],
    available_platforms: list[str],
) -> str:
    doc_sections = []
    for platform, context in platform_documentation.items():
        doc_sections.append(f"=== {platform.upper()} DOCUMENTATION ===\n{context}")

    return f"""
Repository analysis:
{repository_context or "No repository context."}

User deployment requirements (from interview):
{user_requirements}

Platforms available in knowledge base:
{json.dumps(available_platforms)}

Retrieved official documentation (ONLY source of truth for platform capabilities):
{chr(10).join(doc_sections) if doc_sections else "No documentation retrieved."}

Recommend the best deployment strategy grounded strictly in the documentation above.

Return JSON with this exact shape:
{{
  "primary_platform": "platform name",
  "alternatives": [
    {{
      "platform": "name",
      "fit_score": 0.0-1.0,
      "summary": "why this is or is not a good fit",
      "pros": ["pro grounded in docs"],
      "cons": ["con grounded in docs"]
    }}
  ],
  "hybrid_deployment": {{
    "recommended": boolean,
    "description": "when hybrid makes sense",
    "components": [
      {{"platform": "name", "role": "frontend|backend|database|worker", "reason": "doc-grounded reason"}}
    ]
  }},
  "required_services": ["service names from docs"],
  "deployment_complexity": "low|medium|high",
  "configuration_steps": ["step grounded in docs"],
  "build_commands": ["commands from repo analysis or docs"],
  "runtime_requirements": ["runtime requirements from docs"],
  "environment_variables": ["env vars needed"],
  "limitations": ["platform limitations from docs"],
  "expected_costs": {{
    "summary": "cost summary from docs only",
    "estimate_range": "range if documented, else null",
    "notes": ["cost notes from docs"],
    "grounded_in_documentation": true
  }},
  "confidence_score": 0.0-1.0,
  "explanation": "detailed evidence-based explanation",
  "citations": [
    {{
      "source_file": "file",
      "relative_path": "path",
      "platform": "platform",
      "heading": "heading",
      "excerpt": "short excerpt"
    }}
  ],
  "documentation_gaps": ["areas where docs were insufficient"]
}}

Never cite capabilities not present in the retrieved documentation.
""".strip()


def format_user_requirements(answers: list[dict[str, str]]) -> str:
    if not answers:
        return "No explicit user requirements collected yet."
    lines = []
    for item in answers:
        lines.append(f"- {item['question']}: {item['answer']}")
    return "\n".join(lines)


def extract_known_facts_from_analysis(repository_analysis: dict[str, Any]) -> list[str]:
    """Derive facts from repository analysis that should not be re-asked."""
    facts: list[str] = []
    data = repository_analysis or {}
    scan = data.get("facts") or data

    repository = scan.get("repository") or {}
    if repository.get("name"):
        facts.append(f"Repository: {repository['name']}")
    if repository.get("primary_language"):
        facts.append(f"Primary language: {repository['primary_language']}")

    frameworks = scan.get("frameworks") or {}
    for label, items in (("Frontend", frameworks.get("frontend")), ("Backend", frameworks.get("backend"))):
        if items:
            facts.append(f"{label} frameworks: {', '.join(items)}")

    runtime = scan.get("runtime") or {}
    if runtime.get("primary"):
        facts.append(f"Runtime: {runtime['primary']}")

    database = scan.get("database") or {}
    detected = database.get("detected") or []
    if detected:
        names = [str(item.get("name", item)) for item in detected[:5]]
        facts.append(f"Databases: {', '.join(names)}")

    deployment = scan.get("deployment") or {}
    platforms = deployment.get("detected_platforms") or []
    if platforms:
        facts.append(f"Existing deployment hints: {', '.join(platforms)}")

    containerization = scan.get("containerization") or scan.get("architecture") or {}
    if containerization.get("docker_detected") or containerization.get("has_dockerfile"):
        facts.append("Docker/containerization detected in repository")

    commands = scan.get("commands") or {}
    for key in ("build", "start", "install"):
        if commands.get(key):
            facts.append(f"{key} command: {commands[key]}")

    analysis = data.get("analysis") or {}
    if isinstance(analysis, dict):
        for field in ("technology_stack_summary", "architecture_summary", "deployment_readiness"):
            value = analysis.get(field)
            if value and isinstance(value, str):
                facts.append(f"{field.replace('_', ' ').title()}: {value[:200]}")

    return facts
