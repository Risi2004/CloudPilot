"""Assemble machine-ready scan facts for narrative synthesis."""

from __future__ import annotations

from typing import Any

from cloudpilot.agents.repository_analysis.schemas import ReportBuilderOutput
from cloudpilot.agents.repository_analysis.tools._helpers import load_scan_facts


def build_report(tool_context: Any | None = None) -> dict:
    """
    Build the machine-readable facts envelope from the latest repository scan.

    Call this after scan_repository. The agent should use the returned facts to
    generate the final human-readable analysis without inventing new data.
    """
    facts = load_scan_facts(tool_context)
    return ReportBuilderOutput(facts=facts, ready_for_analysis=True).model_dump()
