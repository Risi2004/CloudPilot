"""Tool input and output schemas for repository analysis."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from cloudpilot.scanner.models import ScanResult


class CloneRepositoryOutput(BaseModel):
    """Output from cloning a GitHub repository."""

    repo_path: str
    clone_method: str
    default_branch: str | None = None
    owner: str
    repo: str


class ScanRepositoryOutput(BaseModel):
    """Output from scanning a repository."""

    facts: ScanResult


class ReportBuilderOutput(BaseModel):
    """Machine-ready facts envelope before narrative synthesis."""

    facts: ScanResult
    ready_for_analysis: bool = True


class DetectorSectionOutput(BaseModel):
    """Generic wrapper for a single detector section."""

    section: str
    data: dict[str, Any] = Field(default_factory=dict)
