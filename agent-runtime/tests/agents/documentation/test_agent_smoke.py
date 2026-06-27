"""Tests for documentation agent smoke import."""

from __future__ import annotations


def test_documentation_root_agent_imports() -> None:
    from cloudpilot.agents.documentation.agent import root_agent

    assert root_agent.name == "documentation_agent"
    assert root_agent.tools
