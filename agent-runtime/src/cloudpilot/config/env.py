"""Environment-backed settings for CloudPilot AI infrastructure."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_PACKAGE_ROOT = Path(__file__).resolve().parents[2]
_AGENT_RUNTIME_ROOT = _PACKAGE_ROOT.parent


def _load_env_files() -> None:
    """Load environment variables from agent-runtime .env files when present."""
    for env_path in (_AGENT_RUNTIME_ROOT / ".env", _PACKAGE_ROOT / ".env"):
        if env_path.is_file():
            load_dotenv(env_path, override=False)


def _require(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


def _optional_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class AISettings:
    """Validated AI runtime settings read from environment variables."""

    ollama_base_url: str
    ollama_model: str
    ollama_provider: str
    litellm_debug: bool

    @property
    def litellm_model_id(self) -> str:
        return f"{self.ollama_provider}/{self.ollama_model}"

    @property
    def ollama_tags_url(self) -> str:
        return f"{self.ollama_base_url.rstrip('/')}/api/tags"

    @property
    def ollama_chat_url(self) -> str:
        return f"{self.ollama_base_url.rstrip('/')}/api/chat"


def load_settings() -> AISettings:
    """Load and validate AI settings from environment variables."""
    _load_env_files()

    base_url = _require("OLLAMA_BASE_URL").rstrip("/")
    model = _require("OLLAMA_MODEL")
    provider = os.getenv("OLLAMA_PROVIDER", "ollama_chat").strip() or "ollama_chat"

    # BUG-016 fix: The strict check blocked all non-Ollama LiteLLM providers
    # (OpenAI, Anthropic, etc.) without any way to opt out.  The validation is
    # now opt-in via CLOUDPILOT_STRICT_PROVIDER=true so teams can use cloud
    # LLMs without code changes.  The warning is still emitted to guide users.
    strict = _optional_bool("CLOUDPILOT_STRICT_PROVIDER", default=False)
    if provider != "ollama_chat":
        if strict:
            raise ValueError(
                f"OLLAMA_PROVIDER is set to '{provider}'. "
                "With CLOUDPILOT_STRICT_PROVIDER=true only 'ollama_chat' is allowed "
                "for reliable ADK tool calling with Ollama. "
                "Set CLOUDPILOT_STRICT_PROVIDER=false to allow other LiteLLM providers."
            )
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "OLLAMA_PROVIDER='%s' — tool-calling reliability with Ollama is best with "
            "'ollama_chat'. Non-Ollama providers (OpenAI, Anthropic, etc.) are allowed "
            "but unsupported. Set CLOUDPILOT_STRICT_PROVIDER=true to enforce the check.",
            provider,
        )

    return AISettings(
        ollama_base_url=base_url,
        ollama_model=model,
        ollama_provider=provider,
        litellm_debug=_optional_bool("LITELLM_DEBUG", default=False),
    )
