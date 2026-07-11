"""Tests for environment variable classification."""

from __future__ import annotations

from cloudpilot.scanner.utils.env_classifier import (
    classify_env_variable,
    classify_env_variables,
    is_user_required,
    resolve_auto_value,
)


def test_frontend_url_is_auto() -> None:
    result = classify_env_variable("FRONTEND_URL")
    assert result.source == "auto"
    assert not is_user_required("FRONTEND_URL")


def test_database_url_is_user_required() -> None:
    result = classify_env_variable("DATABASE_URL")
    assert result.source == "user"
    assert is_user_required("DATABASE_URL")


def test_secret_key_is_user_required() -> None:
    result = classify_env_variable("JWT_SECRET")
    assert result.source == "user"


def test_vite_public_var_is_auto() -> None:
    result = classify_env_variable("VITE_API_URL")
    assert result.source == "auto"


def test_port_is_auto() -> None:
    result = classify_env_variable("PORT")
    assert result.source == "auto"


def test_classify_deduplicates() -> None:
    items = classify_env_variables(["DATABASE_URL", "DATABASE_URL", "PORT"])
    assert [item.name for item in items] == ["DATABASE_URL", "PORT"]


def test_resolve_auto_value_for_frontend_url() -> None:
    value = resolve_auto_value("FRONTEND_URL", frontend_url="https://app.vercel.app")
    assert value == "https://app.vercel.app"


def test_resolve_auto_value_for_node_env() -> None:
    assert resolve_auto_value("NODE_ENV") == "production"
