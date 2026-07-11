"""Logged HTTP client for deployment platform APIs."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from cloudpilot.agents.deployment.errors import PlatformApiError
from cloudpilot.agents.deployment.phases import DeploymentPhase

logger = logging.getLogger(__name__)


def _extract_error_detail(response: httpx.Response) -> str:
    detail = response.text[:500]
    try:
        payload = response.json()
        if isinstance(payload, dict):
            error_obj = payload.get("error")
            if isinstance(error_obj, dict):
                return error_obj.get("message") or detail
            return payload.get("message") or detail
    except Exception:  # noqa: BLE001
        pass
    return detail


async def platform_request(
    *,
    platform: str,
    phase: DeploymentPhase,
    method: str,
    base_url: str,
    path: str,
    headers: dict[str, str],
    service_id: str | None = None,
    json_body: dict[str, Any] | list[Any] | None = None,
    params: dict[str, str] | None = None,
    timeout: float = 60.0,
    error_code: str = "platform_api_error",
) -> Any:
    """Execute an HTTP request with structured logging and PlatformApiError on failure."""
    url = f"{base_url.rstrip('/')}{path}"
    started = time.perf_counter()

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.request(
            method,
            url,
            headers=headers,
            json=json_body,
            params=params,
        )

    duration_ms = int((time.perf_counter() - started) * 1000)
    log_extra = {
        "platform": platform,
        "phase": phase.value,
        "method": method,
        "path": path,
        "status": response.status_code,
        "duration_ms": duration_ms,
        "service_id": service_id or "",
    }

    if response.status_code >= 400:
        detail = _extract_error_detail(response)
        logger.error(
            "deployment_http_failed",
            extra={**log_extra, "api_error": detail[:500]},
        )
        logger.debug("deployment_http_body path=%s body=%s", path, response.text[:2000])
        raise PlatformApiError(
            message=f"{platform.title()} API error ({response.status_code}): {detail}",
            code=error_code,
            phase=phase,
            platform=platform,
            service_id=service_id,
            http_method=method,
            http_path=path,
            http_status=response.status_code,
            api_error=detail,
        )

    logger.info("deployment_http", extra=log_extra)

    if response.status_code == 204:
        return {}
    if not response.content:
        return {}
    return response.json()
