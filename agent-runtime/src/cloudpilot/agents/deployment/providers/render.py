"""Render deployment provider."""

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

_RENDER_API = "https://api.render.com/v1"
_LIVE_STATUSES = {"live"}
_FAILED_STATUSES = {
    "build_failed",
    "update_failed",
    "deactivated",
    "failed",
    "canceled",
    "pre_deploy_failed",
}


class RenderProvider:
    platform = "render"

    def _api_key(self, credentials: dict[str, str]) -> str:
        key = credentials.get("render_api_key", "").strip()
        if not key:
            raise PlatformApiError(
                message="Render API key is required.",
                code="invalid_credentials",
                phase=DeploymentPhase.AUTHENTICATION,
                platform=self.platform,
            )
        return key

    def _headers(self, credentials: dict[str, str]) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key(credentials)}",
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
        json_body: dict[str, Any] | list[Any] | None = None,
        params: dict[str, str] | None = None,
        error_code: str = "platform_api_error",
    ) -> Any:
        return await platform_request(
            platform=self.platform,
            phase=phase,
            method=method,
            base_url=_RENDER_API,
            path=path,
            headers=self._headers(credentials),
            service_id=service_id,
            json_body=json_body,
            params=params,
            error_code=error_code,
        )

    def _owner_from_entry(self, entry: dict[str, Any]) -> dict[str, Any]:
        nested = entry.get("owner")
        return nested if isinstance(nested, dict) else entry

    def _extract_owner_id(self, owners_payload: Any) -> str | None:
        if not isinstance(owners_payload, list) or not owners_payload:
            return None
        first = owners_payload[0]
        if not isinstance(first, dict):
            return None
        owner = self._owner_from_entry(first)
        owner_id = owner.get("id")
        return owner_id if isinstance(owner_id, str) and owner_id.strip() else None

    async def validate_credentials(self, credentials: dict[str, str]) -> CredentialCheck:
        try:
            owners = await self._request("GET", "/owners", credentials, phase=DeploymentPhase.AUTHENTICATION)
            if isinstance(owners, list) and owners:
                owner = self._owner_from_entry(owners[0])
                name = owner.get("name") or owner.get("email") or "render-owner"
                return CredentialCheck(valid=True, message="Render credentials verified.", account_name=name)
            return CredentialCheck(valid=True, message="Render credentials verified.")
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

        return RepoCheck(accessible=True, message="Repository and branch accessible.", default_branch=default_branch)

    async def _find_service(self, name: str, credentials: dict[str, str]) -> dict[str, Any] | None:
        cursor: str | None = None
        while True:
            params: dict[str, str] = {"limit": "100"}
            if cursor:
                params["cursor"] = cursor
            payload = await self._request(
                "GET",
                "/services",
                credentials,
                phase=DeploymentPhase.PROJECT_CREATION,
                params=params,
            )
            entries = payload if isinstance(payload, list) else payload.get("services", [])
            for entry in entries:
                service = entry.get("service") or entry
                if service.get("name") == name:
                    return service
            if not entries:
                return None
            last_entry = entries[-1]
            next_cursor = last_entry.get("cursor") if isinstance(last_entry, dict) else None
            if not next_cursor:
                return None
            cursor = next_cursor

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
        service_name = f"cloudpilot-{ctx.repo}-{service.id}".lower().replace("_", "-")[:52]
        existing = await self._find_service(service_name, ctx.credentials)
        if existing:
            service_id = existing["id"]
            return ProviderResource(
                resource_id=service_id,
                name=service_name,
                url=existing.get("serviceDetails", {}).get("url"),
            )

        owner_payload = await self._request("GET", "/owners", ctx.credentials, phase=DeploymentPhase.PROJECT_CREATION)
        owners = owner_payload if isinstance(owner_payload, list) else []
        if not owners:
            raise PlatformApiError(
                message="No Render owner account found for this API key.",
                code="invalid_credentials",
                phase=DeploymentPhase.PROJECT_CREATION,
                platform=self.platform,
                service_id=service.id,
            )
        owner_id = self._extract_owner_id(owner_payload)
        if not owner_id:
            raise PlatformApiError(
                message="No Render workspace id found for this API key.",
                code="invalid_credentials",
                phase=DeploymentPhase.PROJECT_CREATION,
                platform=self.platform,
                service_id=service.id,
            )

        service_details: dict[str, Any] = {
            "env": self._runtime_env(service.runtime_version),
            "plan": "free",
            "region": "oregon",
        }
        if service.build_command:
            service_details["buildCommand"] = service.build_command
        if service.start_command:
            service_details["startCommand"] = service.start_command

        create_body: dict[str, Any] = {
            "type": "web_service",
            "name": service_name,
            "ownerId": owner_id,
            "repo": f"https://github.com/{ctx.owner}/{ctx.repo}",
            "branch": ctx.branch,
            "autoDeploy": "no",
            "serviceDetails": service_details,
        }
        if service.build_command:
            create_body["buildCommand"] = service.build_command
        if service.start_command:
            create_body["startCommand"] = service.start_command
        if service.root_directory and service.root_directory != ".":
            create_body["rootDir"] = service.root_directory

        created = await self._request(
            "POST",
            "/services",
            ctx.credentials,
            phase=DeploymentPhase.PROJECT_CREATION,
            service_id=service.id,
            json_body=create_body,
        )
        service_data = created.get("service") or created
        resource_id = service_data.get("id")
        if not resource_id:
            raise PlatformApiError(
                message="Render service creation returned no service id.",
                code="platform_api_error",
                phase=DeploymentPhase.PROJECT_CREATION,
                platform=self.platform,
                service_id=service.id,
                http_method="POST",
                http_path="/services",
            )
        return ProviderResource(
            resource_id=resource_id,
            name=service_name,
            url=service_data.get("serviceDetails", {}).get("url"),
        )

    async def _get_existing_env(self, resource_id: str, credentials: dict[str, str]) -> dict[str, str]:
        try:
            payload = await self._request(
                "GET",
                f"/services/{resource_id}/env-vars",
                credentials,
                phase=DeploymentPhase.CONFIGURATION,
            )
            entries = payload if isinstance(payload, list) else payload.get("envVars", [])
            merged: dict[str, str] = {}
            for entry in entries:
                env_var = entry.get("envVar") or entry
                key = env_var.get("key")
                value = env_var.get("value")
                if key:
                    merged[key] = value or ""
            return merged
        except Exception:  # noqa: BLE001
            return {}

    async def set_environment_variables(
        self,
        resource_id: str,
        env_vars: dict[str, str],
        credentials: dict[str, str],
        *,
        service_id: str | None = None,
    ) -> None:
        if not env_vars:
            return
        existing = await self._get_existing_env(resource_id, credentials)
        merged = {**existing, **env_vars}
        body = [{"envVar": {"key": key, "value": value}} for key, value in merged.items()]
        await self._request(
            "PUT",
            f"/services/{resource_id}/env-vars",
            credentials,
            phase=DeploymentPhase.CONFIGURATION,
            service_id=service_id,
            json_body=body,
        )

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
            phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
            service_id=service.id,
            json_body={"clearCache": False},
        )
        deploy = payload.get("deploy") or payload
        deploy_id = deploy.get("id") or ""
        if not deploy_id:
            raise PlatformApiError(
                message="Render deploy API returned no deploy id.",
                code="render_empty_deploy_id",
                phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
                platform=self.platform,
                service_id=service.id,
                http_method="POST",
                http_path=f"/services/{resource_id}/deploys",
            )
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
        deploy_payload = await self._request(
            "GET",
            f"/services/{resource_id}/deploys/{job_id}",
            credentials,
            phase=DeploymentPhase.MONITORING,
        )
        deploy = deploy_payload.get("deploy") or deploy_payload
        status = (deploy.get("status") or "queued").lower()

        service_payload = await self._request(
            "GET",
            f"/services/{resource_id}",
            credentials,
            phase=DeploymentPhase.MONITORING,
        )
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
            payload = await self._request(
                "GET",
                f"/services/{resource_id}/logs",
                credentials,
                phase=DeploymentPhase.MONITORING,
                params={"tail": str(min(tail, 500))},
            )
            if isinstance(payload, str):
                lines = payload.splitlines()
                return "\n".join(lines[-tail:]) if lines else "No Render logs available."
            if isinstance(payload, list):
                lines = []
                for entry in payload[-tail:]:
                    if isinstance(entry, dict):
                        lines.append(entry.get("message") or entry.get("text") or str(entry))
                    else:
                        lines.append(str(entry))
                return "\n".join(lines) if lines else "No Render logs available."
            logs = payload.get("logs") if isinstance(payload, dict) else None
            if isinstance(logs, list):
                lines = [item.get("message", str(item)) if isinstance(item, dict) else str(item) for item in logs[-tail:]]
                return "\n".join(lines) if lines else "No Render logs available."
            if isinstance(logs, str):
                lines = logs.splitlines()
                return "\n".join(lines[-tail:]) if lines else "No Render logs available."
            return str(payload)[:5000] if payload else "No Render logs available."
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to fetch Render logs for %s: %s", job_id, exc)
            return f"Unable to retrieve Render logs: {exc}"
