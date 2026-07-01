"""Deployment provider registry."""

from __future__ import annotations

from functools import lru_cache

from cloudpilot.agents.deployment.providers.base import DeploymentProvider
from cloudpilot.agents.deployment.providers.render import RenderProvider
from cloudpilot.agents.deployment.providers.vercel import VercelProvider

_PROVIDER_CLASSES: dict[str, type] = {
    "vercel": VercelProvider,
    "render": RenderProvider,
}


@lru_cache(maxsize=8)
def get_provider(platform: str) -> DeploymentProvider:
    """Return a provider instance for the given platform name."""
    normalized = (platform or "").strip().lower()
    provider_cls = _PROVIDER_CLASSES.get(normalized)
    if provider_cls is None:
        raise ValueError(f"Unsupported deployment platform: {platform}")
    return provider_cls()


def list_supported_platforms() -> list[str]:
    """Return deployment platforms with registered providers."""
    return sorted(_PROVIDER_CLASSES.keys())


def credential_key_for_platform(platform: str) -> str | None:
    """Map platform name to credential dict key."""
    mapping = {
        "vercel": "vercel_token",
        "render": "render_api_key",
    }
    return mapping.get((platform or "").strip().lower())
