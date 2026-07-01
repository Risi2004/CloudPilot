"""Tests for deterministic component analyzer."""

from __future__ import annotations

from cloudpilot.agents.architecture.component_analyzer import ComponentAnalyzer


def test_component_analyzer_detects_stack() -> None:
    analysis = {
        "facts": {
            "frameworks": {"frontend": ["React"], "backend": ["Express"]},
            "runtime": {"primary": "Node.js 20"},
            "database": {"detected": [{"name": "MongoDB"}]},
            "commands": {"build": "npm run build", "start": "npm start"},
        }
    }
    result = ComponentAnalyzer().analyze(analysis)
    assert result.application_type == "full_stack_web_application"
    assert any(item.type == "frontend" for item in result.components)
    assert any(item.type == "backend" for item in result.components)
    assert any(item.type == "database" for item in result.components)
