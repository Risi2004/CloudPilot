"""Vercel deployment provider."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from cloudpilot.agents.architecture.models import DeployableService
from cloudpilot.agents.deployment.errors import PlatformApiError
from cloudpilot.agents.deployment.phases import DeploymentPhase
from cloudpilot.agents.deployment.providers.base import (
    CredentialCheck,
    DeployContext,
    DeployJob,
    DeployStatus,
    ProviderResource,
    RepoCheck,
)
from cloudpilot.agents.deployment.providers.http_client import platform_request

logger = logging.getLogger(__name__)

_VERCEL_API = "https://api.vercel.com"
_TERMINAL_READY = {"READY"}
_TERMINAL_FAILED = {"ERROR", "CANCELED"}


class VercelProvider:
    platform = "vercel"

    def _token(self, credentials: dict[str, str]) -> str:
        token = credentials.get("vercel_token", "").strip()
        if not token:
            raise PlatformApiError(
                message="Vercel API token is required.",
                code="invalid_credentials",
                phase=DeploymentPhase.AUTHENTICATION,
                platform=self.platform,
            )
        return token

    def _headers(self, credentials: dict[str, str]) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token(credentials)}",
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        credentials: dict[str, str],
        *,
        phase: DeploymentPhase = DeploymentPhase.DEPLOYMENT_EXECUTION,
        service_id: str | None = None,
        json_body: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
        error_code: str = "platform_api_error",
    ) -> Any:
        return await platform_request(
            platform=self.platform,
            phase=phase,
            method=method,
            base_url=_VERCEL_API,
            path=path,
            headers=self._headers(credentials),
            service_id=service_id,
            json_body=json_body,
            params=params,
            error_code=error_code,
        )

    async def validate_credentials(self, credentials: dict[str, str]) -> CredentialCheck:
        try:
            payload = await self._request(
                "GET",
                "/v2/user",
                credentials,
                phase=DeploymentPhase.AUTHENTICATION,
            )
            user = payload.get("user") or payload
            username = user.get("username") or user.get("email") or "vercel-user"
            return CredentialCheck(valid=True, message="Vercel credentials verified.", account_name=username)
        except PlatformApiError as exc:
            return CredentialCheck(valid=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return CredentialCheck(valid=False, message=str(exc))

    async def validate_repo_access(
        self,
        owner: str,
        repo: str,
        branch: str,
        github_token: str | None,
    ) -> RepoCheck:
        if not github_token:
            return RepoCheck(accessible=False, message="GitHub token required for repository validation.")
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {github_token}",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            repo_resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers=headers,
            )
            if repo_resp.status_code == 404:
                return RepoCheck(accessible=False, message=f"Repository {owner}/{repo} not found or inaccessible.")
            if repo_resp.status_code >= 400:
                return RepoCheck(accessible=False, message=f"GitHub API error: {repo_resp.status_code}")

            repo_data = repo_resp.json()
            default_branch = repo_data.get("default_branch") or branch

            branch_resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/branches/{branch}",
                headers=headers,
            )
            if branch_resp.status_code == 404:
                return RepoCheck(
                    accessible=False,
                    message=f"Branch '{branch}' not found in {owner}/{repo}.",
                    default_branch=default_branch,
                )
            if branch_resp.status_code >= 400:
                return RepoCheck(accessible=False, message=f"GitHub branch check failed: {branch_resp.status_code}")

        return RepoCheck(accessible=True, message="Repository and branch accessible.", default_branch=default_branch)

    async def _find_project(self, name: str, credentials: dict[str, str]) -> dict[str, Any] | None:
        payload = await self._request(
            "GET",
            "/v9/projects",
            credentials,
            phase=DeploymentPhase.PROJECT_CREATION,
            params={"search": name, "limit": "20"},
        )
        for project in payload.get("projects", []):
            if project.get("name") == name:
                return project
        return None

    async def ensure_service(
        self,
        service: DeployableService,
        ctx: DeployContext,
    ) -> ProviderResource:
        project_name = f"cloudpilot-{ctx.repo}-{service.id}".lower().replace("_", "-")[:52]
        existing = await self._find_project(project_name, ctx.credentials)
        if existing:
            project_id = existing["id"]
        else:
            create_body: dict[str, Any] = {
                "name": project_name,
                "framework": None,
                "gitRepository": {
                    "type": "github",
                    "repo": f"{ctx.owner}/{ctx.repo}",
                },
            }
            if service.root_directory and service.root_directory != ".":
                create_body["rootDirectory"] = service.root_directory
            created = await self._request(
                "POST",
                "/v10/projects",
                ctx.credentials,
                phase=DeploymentPhase.PROJECT_CREATION,
                service_id=service.id,
                json_body=create_body,
            )
            project_id = created["id"]

        if service.build_command or service.output_directory:
            update_body: dict[str, Any] = {}
            if service.build_command:
                update_body["buildCommand"] = service.build_command
            if service.output_directory:
                update_body["outputDirectory"] = service.output_directory
            if service.root_directory and service.root_directory != ".":
                update_body["rootDirectory"] = service.root_directory
            if update_body:
                await self._request(
                    "PATCH",
                    f"/v9/projects/{project_id}",
                    ctx.credentials,
                    phase=DeploymentPhase.CONFIGURATION,
                    service_id=service.id,
                    json_body=update_body,
                )

        return ProviderResource(resource_id=project_id, name=project_name)

    async def set_environment_variables(
        self,
        resource_id: str,
        env_vars: dict[str, str],
        credentials: dict[str, str],
        *,
        service_id: str | None = None,
    ) -> None:
        for key, value in env_vars.items():
            await self._request(
                "POST",
                f"/v10/projects/{resource_id}/env",
                credentials,
                phase=DeploymentPhase.CONFIGURATION,
                service_id=service_id,
                params={"upsert": "true"},
                json_body={
                    "key": key,
                    "value": value,
                    "type": "encrypted",
                    "target": ["production", "preview", "development"],
                },
            )

    async def get_project_repo_id(self, resource_id: str, credentials: dict[str, str]) -> str | None:
        project = await self._request(
            "GET",
            f"/v9/projects/{resource_id}",
            credentials,
            phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
        )
        return (project.get("link") or {}).get("repoId")

    async def trigger_deploy(
        self,
        resource_id: str,
        service: DeployableService,
        ctx: DeployContext,
    ) -> DeployJob:
        repo_id = await self.get_project_repo_id(resource_id, ctx.credentials)
        if not repo_id:
            raise PlatformApiError(
                message=(
                    f"Vercel project '{resource_id}' is not linked to GitHub. "
                    "Connect the GitHub integration in Vercel before deploying."
                ),
                code="vercel_missing_repo_link",
                phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
                platform=self.platform,
                service_id=service.id,
                http_method="GET",
                http_path=f"/v9/projects/{resource_id}",
            )

        body: dict[str, Any] = {
            "name": service.name or resource_id,
            "project": resource_id,
            "gitSource": {
                "type": "github",
                "repoId": repo_id,
                "ref": ctx.branch,
                "org": ctx.owner,
                "repo": ctx.repo,
            },
            "target": "production",
        }
        if service.build_command:
            body["buildCommand"] = service.build_command
        payload = await self._request(
            "POST",
            "/v13/deployments",
            ctx.credentials,
            phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
            service_id=service.id,
            json_body=body,
        )
        deployment_id = payload.get("id") or payload.get("uid") or ""
        if not deployment_id:
            raise PlatformApiError(
                message="Vercel deployment API returned no deployment id.",
                code="vercel_empty_deployment_id",
                phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
                platform=self.platform,
                service_id=service.id,
                http_method="POST",
                http_path="/v13/deployments",
            )
        url = payload.get("url")
        if url and not url.startswith("http"):
            url = f"https://{url}"
        return DeployJob(
            job_id=deployment_id,
            resource_id=resource_id,
            status=payload.get("readyState") or payload.get("state") or "QUEUED",
            url=url,
        )

    async def get_status(
        self,
        job_id: str,
        resource_id: str,
        credentials: dict[str, str],
    ) -> DeployStatus:
        payload = await self._request(
            "GET",
            f"/v13/deployments/{job_id}",
            credentials,
            phase=DeploymentPhase.MONITORING,
        )
        state = (payload.get("readyState") or payload.get("state") or "BUILDING").upper()
        url = payload.get("url")
        if url and not url.startswith("http"):
            url = f"https://{url}"

        build_status = "complete" if state in _TERMINAL_READY else "building"
        if state in _TERMINAL_FAILED:
            build_status = "failed"

        return DeployStatus(
            job_id=job_id,
            stage="deploy" if state == "READY" else "build",
            build_status=build_status,
            deploy_status="live" if state == "READY" else ("failed" if state in _TERMINAL_FAILED else "deploying"),
            url=url,
            error=payload.get("errorMessage") or payload.get("error"),
            ready=state == "READY",
            failed=state in _TERMINAL_FAILED,
        )

    async def fetch_logs(
        self,
        job_id: str,
        resource_id: str,
        credentials: dict[str, str],
        *,
        tail: int = 200,
    ) -> str:
        try:
            payload = await self._request(
                "GET",
                f"/v2/deployments/{job_id}/events",
                credentials,
                phase=DeploymentPhase.MONITORING,
                params={"limit": str(min(tail, 100))},
            )
            events = payload if isinstance(payload, list) else payload.get("events", [])
            lines = []
            for event in events[-tail:]:
                text = event.get("text") or event.get("payload", {}).get("text") or str(event)
                lines.append(str(text))
            return "\n".join(lines) if lines else "No deployment events available."
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to fetch Vercel logs for %s: %s", job_id, exc)
            return f"Unable to retrieve Vercel logs: {exc}"
