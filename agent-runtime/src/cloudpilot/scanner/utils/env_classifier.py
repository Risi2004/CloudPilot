"""Classify environment variables as user-provided vs auto-set by CloudPilot/platforms."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel

EnvSource = Literal["user", "auto", "optional"]

_AUTO_EXACT = {
    "PORT",
    "HOST",
    "HOSTNAME",
    "NODE_ENV",
    "VERCEL_URL",
    "RENDER_EXTERNAL_URL",
    "RAILWAY_STATIC_URL",
    "DYNO",
}

_AUTO_SUFFIXES = (
    "_URL",
    "_ORIGIN",
    "_HOST",
)

_AUTO_PREFIXES = (
    "VITE_",
    "NEXT_PUBLIC_",
    "REACT_APP_",
    "NUXT_PUBLIC_",
    "PUBLIC_",
    "EXPO_PUBLIC_",
)

_AUTO_NAME_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^(FRONTEND|CLIENT|APP|SITE|WEB|PUBLIC|BASE)_URL$", re.I), "Set from the live frontend deployment URL."),
    (re.compile(r"^(BACKEND|API|SERVER)_URL$", re.I), "Set from the live backend/API deployment URL."),
    (re.compile(r"^CORS(_ORIGIN)?$", re.I), "Derived from the deployed frontend URL."),
    (re.compile(r"^ALLOWED_ORIGINS$", re.I), "Derived from the deployed frontend URL."),
    (re.compile(r"^PORT$", re.I), "Set automatically by the hosting platform."),
    (re.compile(r"^NODE_ENV$", re.I), "Defaults to production during deployment."),
]

_USER_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"DATABASE|DB_|POSTGRES|MYSQL|MONGO|REDIS|SQLITE", re.I), "External database connection — provide your connection string."),
    (re.compile(r"SECRET|PASSWORD|PRIVATE|CREDENTIAL", re.I), "Secret value — only you can provide this."),
    (re.compile(r"(^|_)KEY($|_)|API_KEY|ACCESS_KEY", re.I), "API key or credential — only you can provide this."),
    (re.compile(r"TOKEN|JWT|SESSION", re.I), "Auth token or session secret — only you can provide this."),
    (re.compile(r"STRIPE|SENDGRID|SMTP|MAILGUN|TWILIO|OPENAI|ANTHROPIC|AWS_", re.I), "Third-party service credential."),
    (re.compile(r"WEBHOOK", re.I), "Webhook secret — configure after deployment URL is known."),
]

_OPTIONAL_EXACT = {
    "LOG_LEVEL",
    "DEBUG",
    "DEV_MODE",
    "VERBOSE",
    "TZ",
    "TIMEZONE",
}


class EnvVariableClassification(BaseModel):
    """How a detected environment variable should be handled."""

    name: str
    source: EnvSource
    reason: str
    auto_value_hint: str | None = None


def classify_env_variable(name: str) -> EnvVariableClassification:
    """Return whether the user must supply a value or CloudPilot/platform sets it."""
    normalized = name.strip()
    upper = normalized.upper()

    if upper in _OPTIONAL_EXACT:
        return EnvVariableClassification(
            name=normalized,
            source="optional",
            reason="Optional tuning variable — not required for initial deployment.",
            auto_value_hint="production",
        )

    if upper in _AUTO_EXACT:
        hint = "production" if upper == "NODE_ENV" else None
        reason = "Set automatically by the hosting platform."
        if upper == "NODE_ENV":
            reason = "Defaults to production during deployment."
        return EnvVariableClassification(
            name=normalized,
            source="auto",
            reason=reason,
            auto_value_hint=hint,
        )

    for prefix in _AUTO_PREFIXES:
        if upper.startswith(prefix):
            return EnvVariableClassification(
                name=normalized,
                source="auto",
                reason="Public build-time variable — injected from the deployment URL at build/deploy.",
                auto_value_hint="Set from deployment URL",
            )

    for pattern, reason in _USER_PATTERNS:
        if pattern.search(upper):
            return EnvVariableClassification(
                name=normalized,
                source="user",
                reason=reason,
            )

    for pattern, reason in _AUTO_NAME_PATTERNS:
        if pattern.search(upper):
            return EnvVariableClassification(
                name=normalized,
                source="auto",
                reason=reason,
                auto_value_hint="Set after deployment goes live",
            )

    if any(upper.endswith(suffix) for suffix in _AUTO_SUFFIXES):
        if not any(token in upper for token in ("API_KEY", "SECRET", "TOKEN", "PRIVATE")):
            return EnvVariableClassification(
                name=normalized,
                source="auto",
                reason="URL or origin variable — set from the matching deployed service URL.",
                auto_value_hint="Set after deployment goes live",
            )

    return EnvVariableClassification(
        name=normalized,
        source="user",
        reason="Required application configuration — provide the production value.",
    )


def classify_env_variables(names: list[str]) -> list[EnvVariableClassification]:
    """Classify a list of variable names, preserving order and deduplicating."""
    seen: set[str] = set()
    result: list[EnvVariableClassification] = []
    for name in names:
        key = name.strip()
        if not key or key.upper() in seen:
            continue
        seen.add(key.upper())
        result.append(classify_env_variable(key))
    return result


def partition_env_variables(names: list[str]) -> dict[str, list[EnvVariableClassification]]:
    """Group classifications by source."""
    classifications = classify_env_variables(names)
    return {
        "user": [item for item in classifications if item.source == "user"],
        "auto": [item for item in classifications if item.source == "auto"],
        "optional": [item for item in classifications if item.source == "optional"],
        "all": classifications,
    }


def is_user_required(name: str) -> bool:
    return classify_env_variable(name).source == "user"


def resolve_auto_value(
    name: str,
    *,
    service_urls: dict[str, str] | None = None,
    frontend_url: str | None = None,
    backend_url: str | None = None,
) -> str | None:
    """Resolve an auto-classified variable from known deployment URLs."""
    upper = name.strip().upper()
    classification = classify_env_variable(name)
    if classification.source != "auto":
        return None

    if upper == "NODE_ENV":
        return "production"
    if upper == "PORT":
        return "3000"

    if frontend_url and re.search(r"FRONTEND|CLIENT|APP|SITE|WEB|PUBLIC|BASE|CORS|ALLOWED_ORIGIN", upper):
        if upper == "ALLOWED_ORIGINS":
            return frontend_url
        return frontend_url

    if backend_url and re.search(r"BACKEND|API|SERVER", upper):
        return backend_url

    if frontend_url and upper.startswith(("VITE_", "NEXT_PUBLIC_", "REACT_APP_", "NUXT_PUBLIC_", "PUBLIC_", "EXPO_PUBLIC_")):
        if "URL" in upper or "ORIGIN" in upper or "HOST" in upper or "API" in upper:
            if "API" in upper and backend_url:
                return backend_url
            return frontend_url

    if service_urls:
        for url in service_urls.values():
            if url:
                return url

    return classification.auto_value_hint if classification.auto_value_hint not in {None, "Set after deployment goes live", "Set from deployment URL"} else None
