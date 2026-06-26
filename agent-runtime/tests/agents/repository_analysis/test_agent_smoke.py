"""Smoke tests for the Repository Analysis Agent."""

from __future__ import annotations

from cloudpilot.agents.repository_analysis.agent import root_agent
from cloudpilot.agents.repository_analysis.tools import ALL_TOOLS


def test_root_agent_configured() -> None:
    assert root_agent.name == "repository_analysis_agent"
    assert root_agent.instruction
    assert root_agent.output_schema is not None


def test_tools_registered() -> None:
    tool_names = {tool.__name__ for tool in ALL_TOOLS}
    assert "clone_github_repo" in tool_names
    assert "scan_repository" in tool_names
    assert "build_report" in tool_names
    assert len(ALL_TOOLS) == 14
