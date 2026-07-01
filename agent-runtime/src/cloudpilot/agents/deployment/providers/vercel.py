"""Vercel deployment provider."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from cloudpilot.agents.architecture.models import DeployableService
from cloudpilot.agents.deployment.providers.base import (
    CredentialCheck,
    DeployContext,
    DeployJob,
    DeployStatus,
    ProviderResource,
    RepoCheck,
)

logger = logging.getLogger(__name__)

_VERCEL_API = "https://api.vercel.com"
_TERMINAL_READY = {"READY", "CANCELED"}
_TERMINAL_FAILED = {"ERROR", "CANCELED"}


class VercelProvider:
    platform = "vercel"

    def _token(self, credentials: dict[str, str]) -> str:
        token = credentials.get("vercel_token", "").strip()
        if not token:
            raise ValueError("Vercel API token is required.")
        return token

    async def _request(
        self,
        method: str,
        path: str,
        credentials: dict[str, str],
        *,
        json_body: dict[str, Any] | None = None,
        params: dict[str, str] | None = None,
    ) -> Any:
        token = self._token(credentials)
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                method,
                f"{_VERCEL_API}{path}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json=json_body,
                params=params,
            )
        if response.status_code >= 400:
            detail = response.text[:500]
            try:
                payload = response.json()
                detail = payload.get("error", {}).get("message") or payload.get("message") or detail
            except Exception:  # noqa: BLE001
                pass
            raise RuntimeError(f"Vercel API error ({response.status_code}): {detail}")
        if response.status_code == 204:
            return {}
        return response.json()

    async def validate_credentials(self, credentials: dict[str, str]) -> CredentialCheck:
        try:
            payload = await self._request("GET", "/v2/user", credentials)
            user = payload.get("user") or payload
            username = user.get("username") or user.get("email") or "vercel-user"
            return CredentialCheck(valid=True, message="Vercel credentials verified.", account_name=username)
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
        payload = await self._request("GET", "/v9/projects", credentials, params={"search": name, "limit": "20"})
        for project in payload.get("projects", []):
            if project.get("name") == name:
                return project
        return None

    async def ensure_service(
        self,
        service: DeployableService,
        ctx: DeployContext,
    ) -> ProviderResource:
        credentials = ctx.credentials
        project_name = f"cloudpilot-{ctx.repo}-{service.id}".lower().replace("_", "-")[:52]
        existing = await self._find_project(project_name, credentials)
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
            created = await self._request("POST", "/v10/projects", credentials, json_body=create_body)
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
                    credentials,
                    json_body=update_body,
                )

        return ProviderResource(resource_id=project_id, name=project_name)

    async def set_environment_variables(
        self,
        resource_id: str,
        env_vars: dict[str, str],
        credentials: dict[str, str],
    ) -> None:
        for key, value in env_vars.items():
            await self._request(
                "POST",
                f"/v10/projects/{resource_id}/env",
                credentials,
                json_body={
                    "key": key,
                    "value": value,
                    "type": "encrypted",
                    "target": ["production", "preview", "development"],
                },
            )

    async def trigger_deploy(
        self,
        resource_id: str,
        service: DeployableService,
        ctx: DeployContext,
    ) -> DeployJob:
        body: dict[str, Any] = {
            "name": service.name or resource_id,
            "project": resource_id,
            "gitSource": {
                "type": "github",
                "repoId": None,
                "ref": ctx.branch,
                "org": ctx.owner,
                "repo": ctx.repo,
            },
            "target": "production",
        }
        if service.build_command:
            body["buildCommand"] = service.build_command
        payload = await self._request("POST", "/v13/deployments", ctx.credentials, json_body=body)
        deployment_id = payload.get("id") or payload.get("uid") or ""
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
        payload = await self._request("GET", f"/v13/deployments/{job_id}", credentials)
        state = (payload.get("readyState") or payload.get("state") or "BUILDING").upper()
        url = payload.get("url")
        if url and not url.startswith("http"):
            url = f"https://{url}"

        build_status = "complete" if state in _TERMINAL_READY else "building"
        if state in _TERMINAL_FAILED and state != "CANCELED":
            build_status = "failed"

        return DeployStatus(
            job_id=job_id,
            stage="deploy" if state == "READY" else "build",
            build_status=build_status,
            deploy_status="live" if state == "READY" else ("failed" if state == "ERROR" else "deploying"),
            url=url,
            error=payload.get("errorMessage") or payload.get("error"),
            ready=state == "READY",
            failed=state == "ERROR",
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
