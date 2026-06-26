"""Tests for RepositoryAnalysisService."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from cloudpilot.agents.repository_analysis.models import AnalysisNarrative
from cloudpilot.agents.repository_analysis.service import (
    RepositoryAnalysisService,
    compact_facts_for_llm,
)
from cloudpilot.scanner import RepositoryScanner


def test_service_analyze_local_repo(tmp_path: Path) -> None:
    root = tmp_path / "service-repo"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"express": "^4.0.0"},
                "scripts": {"start": "node server.js"},
            }
        ),
        encoding="utf-8",
    )

    mock_analysis = AnalysisNarrative(
        project_overview="Express API project.",
        technology_stack_summary="Node.js and Express.",
        architecture_summary="Backend API server.",
        deployment_readiness="Partially ready.",
        missing_configuration_files=["Dockerfile"],
        potential_deployment_issues=["No lock file detected."],
        risks_before_deployment=["Missing container configuration."],
        recommended_deployment_strategy="Deploy as a Node.js service after adding Dockerfile.",
    )

    with patch.object(
        RepositoryAnalysisService,
        "_generate_analysis",
        return_value=mock_analysis,
    ):
        result = RepositoryAnalysisService().analyze(str(root))

    assert result.facts.frameworks.backend == ["express"]
    assert result.analysis.project_overview == "Express API project."
    assert result.source.kind == "local_path"
    assert result.source.repo_path == str(root.resolve())


def test_compact_facts_for_llm_reduces_payload_size(tmp_path: Path) -> None:
    root = tmp_path / "large-repo"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps({"dependencies": {"express": "^4.0.0"}}),
        encoding="utf-8",
    )
    facts = RepositoryScanner().scan(root)
    full_size = len(facts.model_dump_json().encode("utf-8"))
    compact_size = len(compact_facts_for_llm(facts).encode("utf-8"))
    assert compact_size <= full_size


def test_generate_analysis_retries_invalid_json() -> None:
    service = RepositoryAnalysisService()
    valid = AnalysisNarrative(
        project_overview="ok",
        technology_stack_summary="ok",
        architecture_summary="ok",
        deployment_readiness="ok",
        recommended_deployment_strategy="ok",
    )
    bad_response = MagicMock()
    bad_response.choices = [MagicMock(message=MagicMock(content="not-json"))]
    good_response = MagicMock()
    good_response.choices = [
        MagicMock(message=MagicMock(content=json.dumps(valid.model_dump())))
    ]

    with patch("cloudpilot.agents.repository_analysis.service.litellm.completion") as mock_completion:
        mock_completion.side_effect = [bad_response, good_response]
        result = service._generate_analysis('{"repository": {}}')

    assert result.project_overview == "ok"
    assert mock_completion.call_count == 2


def test_generate_analysis_raises_after_retry_exhausted() -> None:
    service = RepositoryAnalysisService()
    bad_response = MagicMock()
    bad_response.choices = [MagicMock(message=MagicMock(content="still-not-json"))]

    with (
        patch("cloudpilot.agents.repository_analysis.service.litellm.completion", return_value=bad_response),
        pytest.raises(RuntimeError, match="invalid JSON"),
    ):
        service._generate_analysis('{"repository": {}}')


def test_analyze_uses_fallback_when_llm_fails(tmp_path: Path) -> None:
    root = tmp_path / "fallback-repo"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"react": "^18.0.0"},
                "scripts": {"build": "vite build", "dev": "vite"},
            }
        ),
        encoding="utf-8",
    )

    with patch.object(
        RepositoryAnalysisService,
        "_generate_analysis",
        side_effect=RuntimeError("connection failed"),
    ):
        result = RepositoryAnalysisService().analyze(str(root))

    assert "react" in result.analysis.technology_stack_summary.lower()
    assert result.analysis.potential_deployment_issues
    assert result.facts.frameworks.frontend == ["react"]
