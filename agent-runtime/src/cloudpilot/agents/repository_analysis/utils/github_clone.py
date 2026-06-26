"""Clone GitHub repositories via git or API tarball fallback."""

from __future__ import annotations

import io
import logging
import os
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path

import httpx

from cloudpilot.agents.repository_analysis.utils.source_resolver import ResolvedSource

logger = logging.getLogger(__name__)

_DEFAULT_BRANCH = "main"
_FALLBACK_BRANCH = "master"


@dataclass(frozen=True, slots=True)
class CloneResult:
    """Result of cloning a GitHub repository."""

    repo_path: str
    clone_method: str
    owner: str
    repo: str
    default_branch: str | None = None


def _clone_base_dir() -> Path:
    configured = os.getenv("CLOUDPILOT_CLONE_DIR", "").strip()
    if configured:
        base = Path(configured).expanduser()
        base.mkdir(parents=True, exist_ok=True)
        return base
    return Path(tempfile.gettempdir()) / "cloudpilot-clones"


def _should_keep_clones() -> bool:
    return os.getenv("CLOUDPILOT_KEEP_CLONES", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _github_headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    return {"Accept": "application/vnd.github+json"}


def _fetch_default_branch(owner: str, repo: str) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        response = httpx.get(url, headers=_github_headers(), timeout=30.0)
        response.raise_for_status()
        return response.json().get("default_branch") or _DEFAULT_BRANCH
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Could not fetch default branch for %s/%s: %s",
            owner,
            repo,
            exc,
            extra={"owner": owner, "repo": repo},
        )
        return _DEFAULT_BRANCH


def _clone_with_git(owner: str, repo: str, destination: Path, branch: str) -> None:
    clone_url = f"https://github.com/{owner}/{repo}.git"
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        clone_url = f"https://x-access-token:{token}@github.com/{owner}/{repo}.git"

    command = [
        "git",
        "clone",
        "--depth",
        "1",
        "--branch",
        branch,
        clone_url,
        str(destination),
    ]
    subprocess.run(command, check=True, capture_output=True, text=True, timeout=300)


def _is_safe_tar_member(member: tarfile.TarInfo, destination: Path) -> bool:
    member_path = Path(member.name)
    if member_path.is_absolute():
        return False
    if ".." in member_path.parts:
        return False
    target = (destination / member_path).resolve()
    destination_resolved = destination.resolve()
    try:
        target.relative_to(destination_resolved)
    except ValueError:
        return False
    return True


def _extract_tarball(owner: str, repo: str, branch: str, destination: Path) -> None:
    url = f"https://api.github.com/repos/{owner}/{repo}/tarball/{branch}"
    response = httpx.get(url, headers=_github_headers(), timeout=120.0, follow_redirects=True)
    response.raise_for_status()

    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(response.content), mode="r:gz") as archive:
        members = archive.getmembers()
        if not members:
            raise RuntimeError("GitHub tarball was empty.")

        root_prefix = members[0].name.split("/")[0]
        for member in members:
            if not member.name.startswith(f"{root_prefix}/"):
                continue
            relative = member.name[len(root_prefix) + 1 :]
            if not relative:
                continue
            safe_member = tarfile.TarInfo(name=relative)
            safe_member.type = member.type
            safe_member.size = member.size
            safe_member.mode = member.mode
            if not _is_safe_tar_member(safe_member, destination):
                logger.warning(
                    "Skipping unsafe tarball member: %s",
                    member.name,
                    extra={"member": member.name, "owner": owner, "repo": repo},
                )
                continue
            if member.isdir():
                (destination / relative).mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                target = destination / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                extracted = archive.extractfile(member)
                if extracted:
                    target.write_bytes(extracted.read())


def _find_repo_root(destination: Path) -> Path:
    if (destination / ".git").exists() or (destination / "package.json").exists():
        return destination
    children = [child for child in destination.iterdir() if child.is_dir()]
    if len(children) == 1:
        return children[0]
    return destination


def _clean_destination(destination: Path) -> None:
    """Remove a clone directory, retrying on Windows file-lock races."""
    if not destination.exists():
        return
    for attempt in range(5):
        try:
            shutil.rmtree(destination)
            if not destination.exists():
                return
        except OSError:
            if attempt < 4:
                time.sleep(0.4)
    shutil.rmtree(destination, ignore_errors=True)


def _clone_destination(owner: str, repo: str) -> Path:
    safe_owner = sanitize_repo_dirname(owner)
    safe_repo = sanitize_repo_dirname(repo)
    suffix = int(time.time() * 1000)
    return _clone_base_dir() / f"{safe_owner}-{safe_repo}-{suffix}"


def _attempt_git_clone(owner: str, repo: str, destination: Path, branch: str) -> str:
    branches_to_try = [branch]
    if branch == _DEFAULT_BRANCH and _FALLBACK_BRANCH not in branches_to_try:
        branches_to_try.append(_FALLBACK_BRANCH)

    last_error: Exception | None = None
    for candidate in branches_to_try:
        _clean_destination(destination)
        try:
            _clone_with_git(owner, repo, destination, candidate)
            return candidate
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or "").strip()
            logger.warning(
                "git clone failed for %s/%s on branch %s: %s",
                owner,
                repo,
                candidate,
                stderr or exc,
                extra={
                    "owner": owner,
                    "repo": repo,
                    "branch": candidate,
                    "stderr": stderr,
                },
            )
            last_error = exc
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "git clone failed for %s/%s on branch %s: %s",
                owner,
                repo,
                candidate,
                exc,
                extra={"owner": owner, "repo": repo, "branch": candidate},
            )
            last_error = exc

    if last_error:
        raise last_error
    raise RuntimeError(f"git clone failed for {owner}/{repo}")


def clone_github_repository(source: ResolvedSource, *, branch: str | None = None) -> CloneResult:
    """
    Clone a GitHub repository using git, falling back to API tarball download.

    Raises:
        ValueError: If the source is not a GitHub URL.
        RuntimeError: If both clone strategies fail.
    """
    if not source.owner or not source.repo:
        raise ValueError("GitHub source must include owner and repository name.")

    started = time.perf_counter()
    owner = source.owner
    repo = source.repo
    resolved_branch = branch or _fetch_default_branch(owner, repo)

    destination = _clone_destination(owner, repo)
    _clean_destination(destination)

    clone_method = "git"
    used_branch = resolved_branch
    try:
        used_branch = _attempt_git_clone(owner, repo, destination, resolved_branch)
        repo_path = _find_repo_root(destination)
    except Exception as git_error:  # noqa: BLE001
        logger.warning(
            "git clone exhausted for %s/%s, falling back to tarball: %s",
            owner,
            repo,
            git_error,
            extra={"owner": owner, "repo": repo},
        )
        _clean_destination(destination)
        clone_method = "tarball"
        try:
            _extract_tarball(owner, repo, resolved_branch, destination)
            repo_path = _find_repo_root(destination)
        except Exception as tarball_error:  # noqa: BLE001
            raise RuntimeError(
                f"Failed to clone {owner}/{repo} via git and tarball."
            ) from tarball_error

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "clone_complete",
        extra={
            "owner": owner,
            "repo": repo,
            "branch": used_branch,
            "clone_method": clone_method,
            "duration_ms": elapsed_ms,
        },
    )

    return CloneResult(
        repo_path=str(repo_path.resolve()),
        clone_method=clone_method,
        default_branch=used_branch,
        owner=owner,
        repo=repo,
    )


def sanitize_repo_dirname(name: str) -> str:
    """Return a filesystem-safe directory name."""
    return re.sub(r"[^\w.\-]+", "-", name)
