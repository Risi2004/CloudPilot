"""Shared LiteLLM / Google ADK model configuration for CloudPilot agents."""

from __future__ import annotations

import os
from functools import lru_cache

from google.adk.models.lite_llm import LiteLlm

from cloudpilot.config.env import AISettings, load_settings


def _quiet_litellm_console() -> None:
    """Keep LiteLLM from printing colored help text to stdout (breaks JSON CLI output)."""
    os.environ.setdefault("NO_COLOR", "1")
    os.environ.setdefault("FORCE_COLOR", "0")
    try:
        import litellm

        litellm.suppress_debug_info = True
        litellm.set_verbose(False)
    except Exception:  # noqa: BLE001
        pass


def configure_runtime(settings: AISettings | None = None) -> AISettings:
    """
    Apply process-wide environment configuration required by LiteLLM and ADK.

    LiteLLM's Ollama integration reads OLLAMA_API_BASE for non-generation calls,
    so CloudPilot maps OLLAMA_BASE_URL to that variable at runtime.
    """
    _quiet_litellm_console()
    resolved = settings or load_settings()

    os.environ["OLLAMA_API_BASE"] = resolved.ollama_base_url

    if resolved.litellm_debug:
        import litellm

        litellm._turn_on_debug()

    return resolved


@lru_cache(maxsize=1)
def get_litellm_model_id() -> str:
    """Return the LiteLLM model identifier used by all CloudPilot ADK agents."""
    return load_settings().litellm_model_id


def get_default_llm_model() -> LiteLlm:
    """
    Return the shared default ADK LiteLlm model for CloudPilot agents.

    Future specialized agents should import and pass this model to Agent(...)
    instead of constructing their own LiteLlm instances.
    """
    settings = configure_runtime()
    return LiteLlm(model=settings.litellm_model_id)
