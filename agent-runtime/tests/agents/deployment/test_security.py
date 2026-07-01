"""Security masking tests."""

from cloudpilot.agents.deployment.security import mask_env_vars, mask_secret, redact_logs


def test_mask_secret_short_value() -> None:
    assert mask_secret("abc") == "****"


def test_mask_secret_long_value() -> None:
    masked = mask_secret("supersecret123")
    assert "supersecret123" not in masked
    assert masked.startswith("su")


def test_mask_env_vars() -> None:
    assert mask_env_vars({"DATABASE_URL": "postgres://x", "PORT": "3000"}) == {
        "DATABASE_URL": "****",
        "PORT": "****",
    }


def test_redact_logs() -> None:
    text = "Authorization: Bearer mytoken12345 and api_key=secretvalue"
    redacted = redact_logs(text, secrets=["mytoken12345", "secretvalue"])
    assert "mytoken12345" not in redacted
    assert "secretvalue" not in redacted
