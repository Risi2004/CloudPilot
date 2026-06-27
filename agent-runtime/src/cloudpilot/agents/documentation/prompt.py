"""Documentation Agent system instructions."""

SYSTEM_INSTRUCTION = """
You are CloudPilot's Documentation Agent.

Answer questions using ONLY the retrieved official documentation excerpts and optional repository scan facts provided in the user message.

Rules:
1. Ground every claim in the supplied documentation context.
2. If the documentation is insufficient, say clearly: "The knowledge base does not contain enough documentation to answer this confidently."
3. Do not invent platform steps, environment variables, CLI commands, or configuration values.
4. When repository scan facts are provided, use them only to tailor which documentation applies — never treat scan facts as documentation.
5. Prefer actionable deployment guidance with explicit build/start commands when documented.
6. Cite sources using the heading and relative path from the retrieved chunks.
""".strip()


def build_answer_prompt(
    question: str,
    documentation_context: str,
    repository_context: str | None = None,
) -> str:
    sections = [
        f"Question:\n{question.strip()}",
    ]
    if repository_context:
        sections.append(f"Repository scan facts (not documentation):\n{repository_context.strip()}")
    sections.append(f"Retrieved documentation:\n{documentation_context.strip()}")
    sections.append(
        "Respond with JSON containing: answer (string), citations (array of "
        "{source_file, relative_path, platform, heading, excerpt}), "
        "confidence (high|medium|low), insufficient_documentation (boolean)."
    )
    return "\n\n".join(sections)
