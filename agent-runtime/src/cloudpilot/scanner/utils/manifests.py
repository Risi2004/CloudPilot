"""Shared dependency manifest parsing for scanner detectors."""

from __future__ import annotations

import re
from pathlib import Path

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.utils.parsers import composer_packages, merge_dependency_names, parse_requirements

# Pipfile, build.sbt, and .csproj PackageReference parsing are intentionally
# deferred; extend this module when those ecosystems are supported.


def parse_go_mod(text: str | None) -> list[str]:
    """Extract module paths from a go.mod require block."""
    if not text:
        return []

    modules: list[str] = []
    in_block = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("//"):
            continue
        if line.startswith("require ("):
            in_block = True
            continue
        if in_block:
            if line == ")":
                in_block = False
                continue
            module = line.split()[0]
            if module:
                modules.append(module)
            continue
        if line.startswith("require "):
            parts = line.split()
            if len(parts) >= 2:
                modules.append(parts[1])

    return modules


def _go_module_names(modules: list[str]) -> set[str]:
    """Return full module paths and final path segments for dependency matching."""
    names: set[str] = set()
    for module in modules:
        lowered = module.lower()
        names.add(lowered)
        names.add(lowered.rsplit("/", 1)[-1])
    return names


def collect_dependencies(context: ScanContext) -> tuple[set[str], set[str], list[str]]:
    """
    Collect production and development dependency names from manifest files.

    Returns:
        production names, development names, and relative source file paths.
    """
    production: set[str] = set()
    development: set[str] = set()
    source_files: list[str] = []

    package_json = context.root_package_json()
    if package_json:
        source_files.append("package.json")
        prod, dev = merge_dependency_names(package_json)
        production.update(name.lower() for name in prod)
        development.update(name.lower() for name in dev)

    for rel_path in context.find_files("requirements.txt"):
        source_files.append(rel_path.as_posix())
        production.update(pkg.lower() for pkg in parse_requirements(context.read_text(rel_path)))

    for rel_path in context.find_files("pyproject.toml"):
        source_files.append(rel_path.as_posix())
        data = context.read_toml(rel_path)
        project = (data or {}).get("project") or {}
        for key in project.get("dependencies") or []:
            production.add(str(key).split("[", 1)[0].lower())
        optional = project.get("optional-dependencies") or {}
        if isinstance(optional, dict):
            for deps in optional.values():
                if isinstance(deps, list):
                    for key in deps:
                        development.add(str(key).split("[", 1)[0].lower())

    for rel_path in context.find_files("composer.json"):
        source_files.append(rel_path.as_posix())
        prod, dev = composer_packages(context.read_json(rel_path))
        production.update(name.lower() for name in prod)
        development.update(name.lower() for name in dev)

    for rel_path in context.find_files("Cargo.toml"):
        source_files.append(rel_path.as_posix())
        data = context.read_toml(rel_path)
        for section in ("dependencies", "dev-dependencies"):
            deps = (data or {}).get(section) or {}
            target = production if section == "dependencies" else development
            target.update(str(key).lower() for key in deps)

    for rel_path in context.find_files("go.mod"):
        source_files.append(rel_path.as_posix())
        modules = parse_go_mod(context.read_text(rel_path))
        production.update(_go_module_names(modules))

    for rel_path in context.find_files("Gemfile"):
        source_files.append(rel_path.as_posix())
        text = context.read_text(rel_path) or ""
        for line in text.splitlines():
            if "gem " in line:
                match = re.search(r"gem\s+['\"]([^'\"]+)['\"]", line)
                if match:
                    production.add(match.group(1).lower())

    return production, development, source_files


def collect_package_names_lower(context: ScanContext) -> set[str]:
    """Return all dependency names lowercased for framework and package matching."""
    production, development, _ = collect_dependencies(context)
    return production | development
