"""Environment variable template detection."""

from __future__ import annotations

import re

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import EnvironmentInfo, ScanResult
from cloudpilot.scanner.utils.filesystem import ENV_TEMPLATE_NAMES


class EnvironmentDetector:
    """Extract environment variable names from template files only."""

    name = "environment"

    _VAR_PATTERN = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")

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
                    variables.add(match.group(1))

        result.environment = EnvironmentInfo(
            template_files=sorted(template_files),
            variables=sorted(variables),
        )
