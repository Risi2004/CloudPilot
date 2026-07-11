"""Vercel provider tests with mocked HTTP."""

from __future__ import annotations

import asyncio

import pytest

from cloudpilot.agents.architecture.models import DeployableService
from cloudpilot.agents.deployment.errors import PlatformApiError
from cloudpilot.agents.deployment.providers.base import DeployContext
from cloudpilot.agents.deployment.providers.vercel import VercelProvider


def test_trigger_deploy_fails_without_repo_link(monkeypatch) -> None:
    provider = VercelProvider()

    async def fake_request(method, path, credentials, **kwargs):
        if "/projects/" in path and method == "GET":
            return {"link": {}}
        return {}

    monkeypatch.setattr(provider, "_request", fake_request)

    service = DeployableService(id="frontend", name="Frontend", platform="vercel")
    ctx = DeployContext(
        owner="acme",
        repo="demo",
        branch="main",
        source_url="https://github.com/acme/demo",
        credentials={"vercel_token": "token"},
    )

    with pytest.raises(PlatformApiError) as exc_info:
        asyncio.run(provider.trigger_deploy("proj_123", service, ctx))

    assert exc_info.value.code == "vercel_missing_repo_link"


def test_trigger_deploy_rejects_empty_deployment_id(monkeypatch) -> None:
    provider = VercelProvider()

    async def fake_request(method, path, credentials, **kwargs):
        if path.endswith("/projects/proj_123"):
            return {"link": {"repoId": "repo_1"}}
        if path == "/v13/deployments":
            return {"readyState": "QUEUED"}
        return {}

    monkeypatch.setattr(provider, "_request", fake_request)

    service = DeployableService(id="frontend", name="Frontend", platform="vercel")
    ctx = DeployContext(
        owner="acme",
        repo="demo",
        branch="main",
        source_url="https://github.com/acme/demo",
        credentials={"vercel_token": "token"},
    )

    with pytest.raises(PlatformApiError) as exc_info:
        asyncio.run(provider.trigger_deploy("proj_123", service, ctx))

    assert exc_info.value.code == "vercel_empty_deployment_id"
