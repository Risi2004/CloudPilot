"""Build LLM context from repository analysis and retrieved chunks."""

from __future__ import annotations

import json
from typing import Any

from cloudpilot.knowledge.models import Citation, DocumentationAnswer, RetrievedChunk


def build_repository_context(repository_analysis: dict[str, Any] | None) -> str | None:
    if not repository_analysis:
        return None

    facts = repository_analysis.get("facts") or repository_analysis
    lines: list[str] = []

    repository = facts.get("repository") or {}
    if repository.get("name"):
        lines.append(f"Repository: {repository['name']}")

    frameworks = facts.get("frameworks") or {}
    frontend = ", ".join(frameworks.get("frontend") or [])
    backend = ", ".join(frameworks.get("backend") or [])
    if frontend or backend:
        lines.append(f"Frameworks: frontend=[{frontend}] backend=[{backend}]")

    runtime = facts.get("runtime") or {}
    if runtime.get("primary"):
        lines.append(f"Runtime: {runtime['primary']}")

    commands = facts.get("commands") or {}
    for key in ("install", "build", "start", "dev"):
        if commands.get(key):
            lines.append(f"{key}: {commands[key]}")

    deployment = facts.get("deployment") or {}
    platforms = ", ".join(deployment.get("detected_platforms") or [])
    if platforms:
        lines.append(f"Detected platforms: {platforms}")

    health = facts.get("health") or {}
    issues = health.get("issues") or []
    if issues:
        lines.append("Health issues:")
        for issue in issues[:5]:
            lines.append(f"- {issue.get('message', issue)}")

    analysis = repository_analysis.get("analysis")
    if isinstance(analysis, dict) and analysis.get("recommended_deployment_strategy"):
        lines.append(f"Recommended strategy: {analysis['recommended_deployment_strategy']}")

    return "\n".join(lines) if lines else None


def build_documentation_context(chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return "No documentation chunks were retrieved."

    sections: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        sections.append(
            "\n".join(
                [
                    f"[Chunk {index}]",
                    f"Platform: {chunk.platform}",
                    f"Source: {chunk.relative_path}",
                    f"Heading: {chunk.heading}",
                    f"Score: {chunk.score}",
                    chunk.text,
                ]
            )
        )
    return "\n\n---\n\n".join(sections)


def citations_from_chunks(chunks: list[RetrievedChunk], limit: int = 5) -> list[Citation]:
    citations: list[Citation] = []
    for chunk in chunks[:limit]:
        excerpt = chunk.text[:240] + ("…" if len(chunk.text) > 240 else "")
        citations.append(
            Citation(
                source_file=chunk.source_file,
                relative_path=chunk.relative_path,
                platform=chunk.platform,
                heading=chunk.heading,
                excerpt=excerpt,
            )
        )
    return citations


def fallback_answer(question: str, chunks: list[RetrievedChunk]) -> DocumentationAnswer:
    if not chunks:
        return DocumentationAnswer(
            answer=(
                "The knowledge base does not contain enough documentation to answer this confidently."
            ),
            citations=[],
            confidence="low",
            insufficient_documentation=True,
            retrieved_chunk_count=0,
        )

    top = chunks[0]
    answer = (
        f"Based on {top.platform} documentation ({top.relative_path} — {top.heading}), "
        f"here is the most relevant guidance found:\n\n{top.text[:1200]}"
    )
    return DocumentationAnswer(
        answer=answer,
        citations=citations_from_chunks(chunks),
        confidence="medium",
        insufficient_documentation=False,
        retrieved_chunk_count=len(chunks),
    )


def parse_llm_answer(payload: dict[str, Any], chunks: list[RetrievedChunk]) -> DocumentationAnswer:
    citations_raw = payload.get("citations") or []
    citations: list[Citation] = []
    for item in citations_raw:
        if isinstance(item, dict):
            citations.append(Citation.model_validate(item))

    if not citations and chunks:
        citations = citations_from_chunks(chunks)

    insufficient = bool(payload.get("insufficient_documentation"))
    answer = str(payload.get("answer", "")).strip()
    if not answer:
        return fallback_answer("", chunks)

    return DocumentationAnswer(
        answer=answer,
        citations=citations,
        confidence=str(payload.get("confidence", "medium")),
        insufficient_documentation=insufficient,
        retrieved_chunk_count=len(chunks),
    )


def compact_repository_analysis(repository_analysis: dict[str, Any] | None) -> str:
    if not repository_analysis:
        return ""
    return json.dumps(repository_analysis, separators=(",", ":"))
