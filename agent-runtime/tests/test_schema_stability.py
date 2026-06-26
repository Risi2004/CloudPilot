"""
JSON schema contract tests for CloudPilot repository analysis outputs.

Breaking changes to field names require an explicit version bump and updates
to the golden sets in this module.
"""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.agents.repository_analysis.models import AnalysisNarrative, RepositoryAnalysisResult
from cloudpilot.scanner.models import ScanResult
from tests.conftest import scan_repo

SCAN_RESULT_TOP_LEVEL_KEYS = frozenset(
    {
        "repository",
        "frameworks",
        "runtime",
        "packageManager",
        "dependencies",
        "database",
        "environment",
        "deployment",
        "cicd",
        "architecture",
        "commands",
        "health",
    }
)

ANALYSIS_NARRATIVE_KEYS = frozenset(
    {
        "project_overview",
        "technology_stack_summary",
        "architecture_summary",
        "deployment_readiness",
        "missing_configuration_files",
        "potential_deployment_issues",
        "risks_before_deployment",
        "recommended_deployment_strategy",
    }
)

REPOSITORY_ANALYSIS_RESULT_KEYS = frozenset({"facts", "analysis", "source"})


def test_scan_result_schema_top_level_keys() -> None:
    schema = ScanResult.model_json_schema()
    properties = set(schema.get("properties", {}))
    assert properties == SCAN_RESULT_TOP_LEVEL_KEYS


def test_analysis_narrative_schema_keys() -> None:
    schema = AnalysisNarrative.model_json_schema()
    properties = set(schema.get("properties", {}))
    assert properties == ANALYSIS_NARRATIVE_KEYS


def test_repository_analysis_result_schema_keys() -> None:
    schema = RepositoryAnalysisResult.model_json_schema()
    properties = set(schema.get("properties", {}))
    assert properties == REPOSITORY_ANALYSIS_RESULT_KEYS


def test_scan_result_round_trip(tmp_path: Path) -> None:
    root = tmp_path / "schema-repo"
    root.mkdir()
    (root / "package.json").write_text('{"name": "schema-repo"}', encoding="utf-8")

    facts = scan_repo(root)
    payload = json.loads(facts.model_dump_json())
    restored = ScanResult.model_validate(payload)

    assert set(payload.keys()) == SCAN_RESULT_TOP_LEVEL_KEYS
    assert restored.repository.name == facts.repository.name
    assert restored.frameworks == facts.frameworks
