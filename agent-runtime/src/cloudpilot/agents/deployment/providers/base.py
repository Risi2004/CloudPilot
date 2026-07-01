"""Deployment provider plugin protocol and shared types."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from cloudpilot.agents.architecture.models import DeployableService


@dataclass(slots=True)
class CredentialCheck:
    valid: bool
    message: str = ""
    account_name: str | None = None


@dataclass(slots=True)
class RepoCheck:
    accessible: bool
    message: str = ""
    default_branch: str | None = None


@dataclass(slots=True)
class DeployContext:
    owner: str
    repo: str
    branch: str
    source_url: str
    github_token: str | None = None
    credentials: dict[str, str] = field(default_factory=dict)
    env_vars: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class ProviderResource:
    resource_id: str
    name: str
    url: str | None = None


@dataclass(slots=True)
class DeployJob:
    job_id: str
    resource_id: str
    status: str = "queued"
    url: str | None = None


@dataclass(slots=True)
class DeployStatus:
    job_id: str
    stage: str
    build_status: str
    deploy_status: str
    url: str | None = None
    error: str | None = None
    ready: bool = False
    failed: bool = False


class DeploymentProvider(Protocol):
    """Platform-specific deployment operations."""

    platform: str

    async def validate_credentials(self, credentials: dict[str, str]) -> CredentialCheck: ...

    async def validate_repo_access(
        self,
        owner: str,
        repo: str,
        branch: str,
        github_token: str | None,
    ) -> RepoCheck: ...

    async def ensure_service(
        self,
        service: DeployableService,
        ctx: DeployContext,
    ) -> ProviderResource: ...

    async def set_environment_variables(
        self,
        resource_id: str,
        env_vars: dict[str, str],
        credentials: dict[str, str],
    ) -> None: ...

    async def trigger_deploy(
        self,
        resource_id: str,
        service: DeployableService,
        ctx: DeployContext,
    ) -> DeployJob: ...

    async def get_status(
        self,
        job_id: str,
        resource_id: str,
        credentials: dict[str, str],
    ) -> DeployStatus: ...

    async def fetch_logs(
        self,
        job_id: str,
        resource_id: str,
        credentials: dict[str, str],
        *,
        tail: int = 200,
    ) -> str: ...
