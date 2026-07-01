"""Tests for architecture agent smoke import."""

from __future__ import annotations


def test_architecture_root_agent_imports() -> None:
    from cloudpilot.agents.architecture.agent import root_agent

    assert root_agent.name == "architecture_agent"
    assert root_agent.tools
