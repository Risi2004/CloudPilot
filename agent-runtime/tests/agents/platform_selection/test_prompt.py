"""Tests for extracting known facts from repository analysis."""

from __future__ import annotations

from cloudpilot.agents.platform_selection.prompt import extract_known_facts_from_analysis


def test_extract_known_facts_from_analysis() -> None:
    analysis = {
        "facts": {
            "repository": {"name": "my-app", "primary_language": "TypeScript"},
            "frameworks": {"frontend": ["React"], "backend": ["Express"]},
            "runtime": {"primary": "Node.js 20"},
            "database": {"detected": [{"name": "MongoDB"}]},
            "commands": {"build": "npm run build", "start": "npm start"},
        },
        "analysis": {
            "technology_stack_summary": "React SPA with Express API",
        },
    }
    facts = extract_known_facts_from_analysis(analysis)
    assert any("React" in fact for fact in facts)
    assert any("Express" in fact for fact in facts)
    assert any("MongoDB" in fact for fact in facts)
    assert not any("budget" in fact.lower() for fact in facts)
