"""Tests for source resolver and GitHub clone utilities."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from cloudpilot.agents.repository_analysis.tools.github_tool import clone_github_repo
from cloudpilot.agents.repository_analysis.utils.github_clone import CloneResult
from cloudpilot.agents.repository_analysis.utils.source_resolver import (
    SourceKind,
    parse_github_url,
    resolve_source,
)


def test_parse_github_url() -> None:
    parsed = parse_github_url("https://github.com/vercel/next.js")
    assert parsed is not None
    assert parsed.owner == "vercel"
    assert parsed.repo == "next.js"
    assert parsed.kind == SourceKind.GITHUB_URL


def test_resolve_local_path(tmp_path: Path) -> None:
    repo = tmp_path / "local-repo"
    repo.mkdir()
    resolved = resolve_source(str(repo))
    assert resolved.kind == SourceKind.LOCAL_PATH
    assert Path(resolved.value).name == "local-repo"


def test_resolve_invalid_source() -> None:
    with pytest.raises(ValueError):
        resolve_source("/path/does/not/exist")


def test_clone_github_repo_tool_stores_session_state(tmp_path: Path) -> None:
    repo_path = tmp_path / "acme-demo"
    repo_path.mkdir()

    class FakeToolContext:
        def __init__(self) -> None:
            self.state: dict[str, str] = {}

    context = FakeToolContext()
    clone_result = CloneResult(
        repo_path=str(repo_path),
        clone_method="git",
        owner="acme",
        repo="demo",
        default_branch="main",
    )

    with patch(
        "cloudpilot.agents.repository_analysis.tools.github_tool.clone_github_repository",
        return_value=clone_result,
    ):
        output = clone_github_repo("https://github.com/acme/demo", tool_context=context)

    assert output["repo_path"] == str(repo_path)
    assert context.state["cloudpilot.repo_path"] == str(repo_path)
