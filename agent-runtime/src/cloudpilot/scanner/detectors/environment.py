"""Environment variable template detection."""

from __future__ import annotations

import re

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import EnvironmentInfo, ScanResult
from cloudpilot.scanner.utils.env_classifier import classify_env_variables
from cloudpilot.scanner.utils.filesystem import ENV_TEMPLATE_NAMES


class EnvironmentDetector:
    """Extract environment variable names from template files only."""

    name = "environment"

    _VAR_PATTERN = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")

    _CLOUDPILOT_INTERNAL_VARS = {
        "agent_runtime_python",
        "agent_runtime_dir",
        "agent_runtime_timeout_ms",
        "ollama_base_url",
        "ollama_model",
        "ollama_provider",
        "github_token",
        "cloudpilot_clone_dir",
        "embedding_model",
        "embedding_provider",
        "chroma_persist_dir",
        "vector_store",
        "knowledge_sync_timeout_ms",
        "platform_selection_timeout_ms",
        "architecture_timeout_ms",
        "deployment_session_ttl_seconds",
        "deployment_timeout_ms",
        "deployment_poll_timeout_ms",
        "knowledge_sync_batch_size",
        "knowledge_upsert_batch_size",
        "embedding_request_batch_size",
        "embedding_max_retries",
        "embedding_retry_base_delay_sec",
        "embedding_inter_batch_delay_sec",
        "litellm_debug",
    }

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        template_files: list[str] = []
        variables: set[str] = set()

        for file_path in context.files:
            if file_path.name.lower() not in ENV_TEMPLATE_NAMES:
                continue
            template_files.append(file_path.as_posix())
            text = context.read_text(file_path)
            if not text:
                continue
            for line in text.splitlines():
                match = self._VAR_PATTERN.match(line)
                if match:
                    var_name = match.group(1)
                    if var_name.lower() not in self._CLOUDPILOT_INTERNAL_VARS:
                        variables.add(var_name)

        sorted_vars = sorted(variables)
        classifications = classify_env_variables(sorted_vars)

        result.environment = EnvironmentInfo(
            template_files=sorted(template_files),
            variables=sorted_vars,
            user_required=[item.name for item in classifications if item.source == "user"],
            auto_provided=[item.name for item in classifications if item.source == "auto"],
            optional=[item.name for item in classifications if item.source == "optional"],
            classifications=[
                {
                    "name": item.name,
                    "source": item.source,
                    "reason": item.reason,
                    "auto_value_hint": item.auto_value_hint or "",
                }
                for item in classifications
            ],
        )
