"""Tests for GitHub clone utilities."""

from __future__ import annotations

import io
import subprocess
import tarfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx
import pytest

from cloudpilot.agents.repository_analysis.utils.github_clone import (
    _extract_tarball,
    _is_safe_tar_member,
    clone_github_repository,
    sanitize_repo_dirname,
)
from cloudpilot.agents.repository_analysis.utils.source_resolver import ResolvedSource, SourceKind


def test_sanitize_repo_dirname() -> None:
    assert sanitize_repo_dirname("owner/repo name") == "owner-repo-name"


def test_is_safe_tar_member_rejects_traversal(tmp_path: Path) -> None:
    member = tarfile.TarInfo(name="../escape.txt")
    assert _is_safe_tar_member(member, tmp_path) is False


def test_extract_tarball_skips_unsafe_members(tmp_path: Path) -> None:
    destination = tmp_path / "extracted"
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        safe = tarfile.TarInfo(name="repo-main/README.md")
        safe.size = 5
        archive.addfile(safe, io.BytesIO(b"hello"))
        unsafe = tarfile.TarInfo(name="repo-main/../../evil.txt")
        unsafe.size = 4
        archive.addfile(unsafe, io.BytesIO(b"evil"))

    response = MagicMock()
    response.content = buffer.getvalue()
    response.raise_for_status = MagicMock()

    with patch("cloudpilot.agents.repository_analysis.utils.github_clone.httpx.get", return_value=response):
        _extract_tarball("owner", "repo", "main", destination)

    assert (destination / "README.md").read_text(encoding="utf-8") == "hello"
    assert not (tmp_path / "evil.txt").exists()


def test_clone_retries_master_after_main_failure(tmp_path: Path) -> None:
    source = ResolvedSource(
        kind=SourceKind.GITHUB_URL,
        value="https://github.com/acme/demo",
        owner="acme",
        repo="demo",
    )
    calls: list[str] = []

    def fake_clone(owner: str, repo: str, destination: Path, branch: str) -> None:
        calls.append(branch)
        if branch == "main":
            raise subprocess.CalledProcessError(1, "git", stderr="branch not found")

    with (
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._clone_base_dir",
            return_value=tmp_path / "clones",
        ),
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._fetch_default_branch",
            return_value="main",
        ),
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._clone_with_git",
            side_effect=fake_clone,
        ),
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._find_repo_root",
            side_effect=lambda path: path,
        ),
    ):
        destination = tmp_path / "clones" / "acme-demo-main"
        destination.mkdir(parents=True)
        (destination / "package.json").write_text("{}", encoding="utf-8")
        result = clone_github_repository(source)

    assert calls == ["main", "master"]
    assert result.clone_method == "git"
    assert result.default_branch == "master"


def test_clone_falls_back_to_tarball(tmp_path: Path) -> None:
    source = ResolvedSource(
        kind=SourceKind.GITHUB_URL,
        value="https://github.com/acme/demo",
        owner="acme",
        repo="demo",
    )

    with (
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._clone_base_dir",
            return_value=tmp_path / "clones",
        ),
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._fetch_default_branch",
            return_value="main",
        ),
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._attempt_git_clone",
            side_effect=RuntimeError("git unavailable"),
        ),
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._extract_tarball",
        ) as mock_extract,
        patch(
            "cloudpilot.agents.repository_analysis.utils.github_clone._find_repo_root",
            side_effect=lambda path: path,
        ),
    ):
        destination = tmp_path / "clones" / "acme-demo-main"
        destination.mkdir(parents=True)
        (destination / "package.json").write_text("{}", encoding="utf-8")
        result = clone_github_repository(source)

    assert result.clone_method == "tarball"
    mock_extract.assert_called_once()


def test_clone_requires_owner_and_repo() -> None:
    source = ResolvedSource(kind=SourceKind.GITHUB_URL, value="https://github.com/acme/demo")
    with pytest.raises(ValueError, match="owner and repository"):
        clone_github_repository(source)
