"""Tests for platform selection agent smoke import."""

from __future__ import annotations


def test_platform_selection_root_agent_imports() -> None:
    from cloudpilot.agents.platform_selection.agent import root_agent

    assert root_agent.name == "platform_selection_agent"
    assert root_agent.tools


def test_platform_selection_request_model() -> None:
    from cloudpilot.agents.platform_selection.models import PlatformSelectionRequest

    request = PlatformSelectionRequest.model_validate(
        {"repository_analysis": {"facts": {"repository": {"name": "demo"}}}}
    )
    assert request.repository_analysis["facts"]["repository"]["name"] == "demo"
