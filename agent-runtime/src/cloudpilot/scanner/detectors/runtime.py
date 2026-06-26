"""Runtime detection."""

from __future__ import annotations

import re
from pathlib import Path

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import RuntimeEntry, RuntimeInfo, ScanResult


class RuntimeDetector:
    """Detect language runtimes and versions from version files."""

    name = "runtime"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        runtimes: list[RuntimeEntry] = []
        version_files: list[str] = []

        if context.has_file("package.json"):
            version_files.append("package.json")
            engines = (context.root_package_json() or {}).get("engines") or {}
            node_version = engines.get("node")
            if node_version:
                runtimes.append(RuntimeEntry(name="node.js", version=str(node_version), source_file="package.json"))
            elif not any(item.name == "node.js" for item in runtimes):
                runtimes.append(RuntimeEntry(name="node.js", source_file="package.json"))

        for rel_path in context.find_files(".nvmrc"):
            version_files.append(rel_path.as_posix())
            version = _clean_version(context.read_text(rel_path))
            if version:
                runtimes.append(RuntimeEntry(name="node.js", version=version, source_file=rel_path.as_posix()))

        for rel_path in context.find_files(".node-version"):
            version_files.append(rel_path.as_posix())
            version = _clean_version(context.read_text(rel_path))
            if version:
                runtimes.append(RuntimeEntry(name="node.js", version=version, source_file=rel_path.as_posix()))

        for rel_path in context.find_files("pyproject.toml"):
            version_files.append(rel_path.as_posix())
            runtimes.append(RuntimeEntry(name="python", source_file=rel_path.as_posix()))
            data = context.read_toml(rel_path)
            requires_python = ((data or {}).get("project") or {}).get("requires-python")
            if requires_python:
                runtimes[-1] = RuntimeEntry(name="python", version=str(requires_python), source_file=rel_path.as_posix())

        for rel_path in context.find_files("requirements.txt"):
            version_files.append(rel_path.as_posix())
            if not any(item.name == "python" for item in runtimes):
                runtimes.append(RuntimeEntry(name="python", source_file=rel_path.as_posix()))

        for rel_path in context.find_files(".python-version"):
            version_files.append(rel_path.as_posix())
            version = _clean_version(context.read_text(rel_path))
            runtimes.append(RuntimeEntry(name="python", version=version, source_file=rel_path.as_posix()))

        for rel_path in [*context.find_files("pom.xml"), *context.find_files("build.gradle"), *context.find_files("build.gradle.kts")]:
            version_files.append(rel_path.as_posix())
            runtimes.append(RuntimeEntry(name="java", source_file=rel_path.as_posix()))

        for rel_path in context.find_suffix(".csproj"):
            version_files.append(rel_path.as_posix())
            runtimes.append(RuntimeEntry(name=".net", source_file=rel_path.as_posix()))

        for rel_path in context.find_files("global.json"):
            version_files.append(rel_path.as_posix())
            sdk = (context.read_json(rel_path) or {}).get("sdk", {}).get("version")
            if sdk:
                runtimes.append(RuntimeEntry(name=".net", version=str(sdk), source_file=rel_path.as_posix()))

        for rel_path in context.find_files("composer.json"):
            version_files.append(rel_path.as_posix())
            runtimes.append(RuntimeEntry(name="php", source_file=rel_path.as_posix()))

        for rel_path in context.find_files("go.mod"):
            version_files.append(rel_path.as_posix())
            text = context.read_text(rel_path) or ""
            match = re.search(r"^go\s+(\S+)", text, re.MULTILINE)
            runtimes.append(
                RuntimeEntry(
                    name="go",
                    version=match.group(1) if match else None,
                    source_file=rel_path.as_posix(),
                )
            )

        for rel_path in context.find_files("Cargo.toml"):
            version_files.append(rel_path.as_posix())
            runtimes.append(RuntimeEntry(name="rust", source_file=rel_path.as_posix()))

        primary = _choose_primary_runtime(runtimes)
        result.runtime = RuntimeInfo(
            primary=primary,
            runtimes=_dedupe_runtimes(runtimes),
            version_files=sorted(set(version_files)),
        )


def _clean_version(text: str | None) -> str | None:
    if not text:
        return None
    return text.strip().splitlines()[0].strip() or None


def _choose_primary_runtime(runtimes: list[RuntimeEntry]) -> str | None:
    priority = ["node.js", "python", "java", ".net", "php", "go", "rust"]
    names = {runtime.name for runtime in runtimes}
    for name in priority:
        if name in names:
            return name
    return runtimes[0].name if runtimes else None


def _dedupe_runtimes(runtimes: list[RuntimeEntry]) -> list[RuntimeEntry]:
    seen: set[tuple[str, str | None, str | None]] = set()
    unique: list[RuntimeEntry] = []
    for runtime in runtimes:
        key = (runtime.name, runtime.version, runtime.source_file)
        if key in seen:
            continue
        seen.add(key)
        unique.append(runtime)
    return unique
