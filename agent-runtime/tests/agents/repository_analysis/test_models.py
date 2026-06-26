"""Tests for AnalysisNarrative normalization."""

from __future__ import annotations

from cloudpilot.agents.repository_analysis.models import AnalysisNarrative, normalize_analysis_payload


def test_normalize_analysis_payload_coerces_nested_objects() -> None:
    payload = {
        "project_overview": {"name": "portfolio", "type": "static"},
        "technology_stack_summary": {"frontend": ["React"]},
        "architecture_summary": {"structure": "src/"},
        "deployment_readiness": {"has_dockerfile": False},
        "missing_configuration_files": "Dockerfile",
        "potential_deployment_issues": ["No lock file"],
        "risks_before_deployment": {"env": "missing template"},
        "recommended_deployment_strategy": {"static_hosting": "Netlify"},
    }

    narrative = AnalysisNarrative.model_validate(normalize_analysis_payload(payload))

    assert isinstance(narrative.project_overview, str)
    assert "portfolio" in narrative.project_overview
    assert isinstance(narrative.technology_stack_summary, str)
    assert narrative.missing_configuration_files == ["Dockerfile"]
    assert len(narrative.risks_before_deployment) == 1
