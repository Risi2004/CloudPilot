"""Render provider tests with mocked HTTP."""

from __future__ import annotations

import asyncio

import pytest

from cloudpilot.agents.architecture.models import DeployableService
from cloudpilot.agents.deployment.errors import PlatformApiError
from cloudpilot.agents.deployment.providers.base import DeployContext
from cloudpilot.agents.deployment.providers.render import RenderProvider


def test_ensure_service_uses_nested_owner_id(monkeypatch) -> None:
    provider = RenderProvider()
    captured: dict = {}

    async def fake_request(method, path, credentials, **kwargs):
        if path == "/services" and method == "GET":
            return []
        if path == "/owners" and method == "GET":
            return [
                {
                    "owner": {
                        "id": "usr-test-owner",
                        "name": "Test User",
                        "email": "test@example.com",
                        "type": "user",
                    },
                    "cursor": "abc",
                },
            ]
        if path == "/services" and method == "POST":
            captured["body"] = kwargs.get("json_body")
            return {"service": {"id": "srv_new", "serviceDetails": {"url": "https://srv.onrender.com"}}}
        return {}

    monkeypatch.setattr(provider, "_request", fake_request)

    service = DeployableService(
        id="frontend",
        name="React App",
        platform="render",
        build_command="npm run build",
        start_command="npm start",
    )
    ctx = DeployContext(
        owner="acme",
        repo="demo",
        branch="main",
        source_url="https://github.com/acme/demo",
        credentials={"render_api_key": "rnd_test"},
    )

    resource = asyncio.run(provider.ensure_service(service, ctx))
    assert resource.resource_id == "srv_new"
    assert captured["body"]["ownerId"] == "usr-test-owner"


def test_trigger_deploy_rejects_empty_deploy_id(monkeypatch) -> None:
    provider = RenderProvider()

    async def fake_request(method, path, credentials, **kwargs):
        return {"deploy": {"status": "queued"}}

    monkeypatch.setattr(provider, "_request", fake_request)

    service = DeployableService(id="backend", name="Backend", platform="render")
    ctx = DeployContext(
        owner="acme",
        repo="demo",
        branch="main",
        source_url="https://github.com/acme/demo",
        credentials={"render_api_key": "rnd_test"},
    )

    with pytest.raises(PlatformApiError) as exc_info:
        asyncio.run(provider.trigger_deploy("srv_123", service, ctx))

    assert exc_info.value.code == "render_empty_deploy_id"


def test_fetch_logs_parses_list_payload(monkeypatch) -> None:
    provider = RenderProvider()

    async def fake_request(method, path, credentials, **kwargs):
        return [{"message": "Build started"}, {"message": "Build complete"}]

    monkeypatch.setattr(provider, "_request", fake_request)

    logs = asyncio.run(provider.fetch_logs("dep_1", "srv_1", {"render_api_key": "rnd_test"}))
    assert "Build started" in logs
    assert "Build complete" in logs
