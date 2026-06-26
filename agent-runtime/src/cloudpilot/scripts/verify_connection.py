"""
Basic connectivity verification for CloudPilot AI infrastructure.

Checks Ollama availability, model presence, LiteLLM reachability, and ADK
LiteLlm initialization. Does not create or run any agents.
"""

from __future__ import annotations

import json
import sys
from typing import Any

import httpx
import litellm

from cloudpilot.config import configure_runtime, get_default_llm_model, load_settings


def _print_step(label: str, ok: bool, detail: str = "") -> None:
    status = "PASS" if ok else "FAIL"
    line = f"[{status}] {label}"
    if detail:
        line = f"{line} — {detail}"
    print(line)


def _check_ollama_server(settings) -> tuple[bool, list[str]]:
    try:
        response = httpx.get(settings.ollama_tags_url, timeout=10.0)
        response.raise_for_status()
        payload = response.json()
        models = [
            model.get("name", "")
            for model in payload.get("models", [])
            if isinstance(model, dict)
        ]
        return True, models
    except Exception as exc:  # noqa: BLE001 - connectivity script reports all failures
        _print_step("Ollama server reachable", False, str(exc))
        return False, []


def _model_is_available(model_name: str, available_models: list[str]) -> bool:
    if model_name in available_models:
        return True
    return any(
        entry == model_name or entry.startswith(f"{model_name}:")
        for entry in available_models
    )


def _check_litellm_completion(model_id: str) -> tuple[bool, str]:
    try:
        response: Any = litellm.completion(
            model=model_id,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=8,
            temperature=0,
        )
        content = response.choices[0].message.content or ""
        return True, content.strip()
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def _check_adk_litellm_wrapper(model_id: str) -> tuple[bool, str]:
    try:
        model = get_default_llm_model()
        if model.model != model_id:
            return False, f"Expected model '{model_id}', got '{model.model}'"
        return True, "LiteLlm wrapper initialized"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def main() -> int:
    print("CloudPilot AI connectivity verification")
    print("=" * 40)

    try:
        settings = configure_runtime()
    except ValueError as exc:
        _print_step("Load environment configuration", False, str(exc))
        return 1

    _print_step(
        "Load environment configuration",
        True,
        json.dumps(
            {
                "ollama_base_url": settings.ollama_base_url,
                "ollama_model": settings.ollama_model,
                "litellm_model_id": settings.litellm_model_id,
            }
        ),
    )

    server_ok, available_models = _check_ollama_server(settings)
    _print_step(
        "Ollama server reachable",
        server_ok,
        f"{len(available_models)} model(s) reported" if server_ok else "",
    )
    if not server_ok:
        return 1

    model_ok = _model_is_available(settings.ollama_model, available_models)
    _print_step(
        "Configured Ollama model available",
        model_ok,
        settings.ollama_model,
    )
    if not model_ok:
        return 1

    litellm_ok, litellm_detail = _check_litellm_completion(settings.litellm_model_id)
    _print_step(
        "LiteLLM completion via Ollama",
        litellm_ok,
        litellm_detail if litellm_ok else litellm_detail,
    )
    if not litellm_ok:
        return 1

    adk_ok, adk_detail = _check_adk_litellm_wrapper(settings.litellm_model_id)
    _print_step("Google ADK LiteLlm wrapper", adk_ok, adk_detail)
    if not adk_ok:
        return 1

    print("=" * 40)
    print("All connectivity checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
