"""Render deployment provider."""

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

_RENDER_API = "https://api.render.com/v1"
_LIVE_STATUSES = {"live", "active"}
_FAILED_STATUSES = {"build_failed", "update_failed", "deactivated", "failed"}


class RenderProvider:
    platform = "render"

    def _api_key(self, credentials: dict[str, str]) -> str:
        key = credentials.get("render_api_key", "").strip()
        if not key:
            raise ValueError("Render API key is required.")
        return key

    async def _request(
        self,
        method: str,
        path: str,
        credentials: dict[str, str],
        *,
        json_body: dict[str, Any] | list[Any] | None = None,
    ) -> Any:
        api_key = self._api_key(credentials)
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                method,
                f"{_RENDER_API}{path}",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=json_body,
            )
        if response.status_code >= 400:
            detail = response.text[:500]
            try:
                payload = response.json()
                if isinstance(payload, dict):
                    detail = payload.get("message") or detail
            except Exception:  # noqa: BLE001
                pass
            raise RuntimeError(f"Render API error ({response.status_code}): {detail}")
        if response.status_code == 204:
            return {}
        return response.json()

    async def validate_credentials(self, credentials: dict[str, str]) -> CredentialCheck:
        try:
            owners = await self._request("GET", "/owners", credentials)
            if isinstance(owners, list) and owners:
                name = owners[0].get("name") or owners[0].get("email") or "render-owner"
                return CredentialCheck(valid=True, message="Render credentials verified.", account_name=name)
            return CredentialCheck(valid=True, message="Render credentials verified.")
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

        return RepoCheck(accessible=True, message="Repository and branch accessible.", default_branch=default_branch)

    async def _find_service(self, name: str, credentials: dict[str, str]) -> dict[str, Any] | None:
        payload = await self._request("GET", "/services", credentials)
        services = payload if isinstance(payload, list) else payload.get("services", [])
        for service in services:
            if service.get("name") == name or service.get("service", {}).get("name") == name:
                return service.get("service") or service
        return None

    def _runtime_env(self, runtime_version: str) -> str:
        runtime = (runtime_version or "node").lower()
        if "node" in runtime or runtime.startswith("18") or runtime.startswith("20"):
            return "node"
        if "python" in runtime or runtime.startswith("3."):
            return "python"
        if "docker" in runtime:
            return "docker"
        return "node"

    async def ensure_service(
        self,
        service: DeployableService,
        ctx: DeployContext,
    ) -> ProviderResource:
        credentials = ctx.credentials
        service_name = f"cloudpilot-{ctx.repo}-{service.id}".lower().replace("_", "-")[:52]
        existing = await self._find_service(service_name, credentials)
        if existing:
            service_id = existing["id"]
            return ProviderResource(
                resource_id=service_id,
                name=service_name,
                url=existing.get("serviceDetails", {}).get("url"),
            )

        owner_payload = await self._request("GET", "/owners", credentials)
        owners = owner_payload if isinstance(owner_payload, list) else []
        if not owners:
            raise RuntimeError("No Render owner account found for this API key.")
        owner_id = owners[0].get("id")

        create_body: dict[str, Any] = {
            "type": "web_service",
            "name": service_name,
            "ownerId": owner_id,
            "repo": f"https://github.com/{ctx.owner}/{ctx.repo}",
            "branch": ctx.branch,
            "autoDeploy": "no",
            "serviceDetails": {
                "env": self._runtime_env(service.runtime_version),
                "plan": "free",
                "region": "oregon",
            },
        }
        if service.build_command:
            create_body["buildCommand"] = service.build_command
        if service.start_command:
            create_body["startCommand"] = service.start_command
        if service.root_directory and service.root_directory != ".":
            create_body["rootDir"] = service.root_directory

        created = await self._request("POST", "/services", credentials, json_body=create_body)
        service_data = created.get("service") or created
        return ProviderResource(
            resource_id=service_data["id"],
            name=service_name,
            url=service_data.get("serviceDetails", {}).get("url"),
        )

    async def set_environment_variables(
        self,
        resource_id: str,
        env_vars: dict[str, str],
        credentials: dict[str, str],
    ) -> None:
        if not env_vars:
            return
        body = [{"key": key, "value": value} for key, value in env_vars.items()]
        await self._request("PUT", f"/services/{resource_id}/env-vars", credentials, json_body=body)

    async def trigger_deploy(
        self,
        resource_id: str,
        service: DeployableService,
        ctx: DeployContext,
    ) -> DeployJob:
        payload = await self._request(
            "POST",
            f"/services/{resource_id}/deploys",
            ctx.credentials,
            json_body={"clearCache": False},
        )
        deploy = payload.get("deploy") or payload
        deploy_id = deploy.get("id") or ""
        return DeployJob(
            job_id=deploy_id,
            resource_id=resource_id,
            status=deploy.get("status") or "queued",
        )

    async def get_status(
        self,
        job_id: str,
        resource_id: str,
        credentials: dict[str, str],
    ) -> DeployStatus:
        deploy_payload = await self._request("GET", f"/deploys/{job_id}", credentials)
        deploy = deploy_payload.get("deploy") or deploy_payload
        status = (deploy.get("status") or "queued").lower()

        service_payload = await self._request("GET", f"/services/{resource_id}", credentials)
        service_data = service_payload.get("service") or service_payload
        url = service_data.get("serviceDetails", {}).get("url")

        build_status = "complete" if status in _LIVE_STATUSES else "building"
        if status in _FAILED_STATUSES:
            build_status = "failed"

        return DeployStatus(
            job_id=job_id,
            stage="deploy" if status in _LIVE_STATUSES else "build",
            build_status=build_status,
            deploy_status="live" if status in _LIVE_STATUSES else ("failed" if status in _FAILED_STATUSES else "deploying"),
            url=url,
            error=deploy.get("failureReason") or deploy.get("message"),
            ready=status in _LIVE_STATUSES,
            failed=status in _FAILED_STATUSES,
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
            payload = await self._request("GET", f"/deploys/{job_id}/logs", credentials)
            logs = payload if isinstance(payload, str) else payload.get("logs") or str(payload)
            lines = logs.splitlines()
            return "\n".join(lines[-tail:]) if lines else "No Render logs available."
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to fetch Render logs for %s: %s", job_id, exc)
            return f"Unable to retrieve Render logs: {exc}"
