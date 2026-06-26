"""Build and start command detection."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import CommandsInfo, ScanResult


class CommandsDetector:
    """Detect install, build, dev, and start commands from manifests."""

    name = "commands"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        commands = CommandsInfo()

        package_json = context.root_package_json()
        if package_json:
            scripts = package_json.get("scripts") or {}
            commands.source = "package.json"
            commands.install = _infer_install_command(context, result)
            commands.build = scripts.get("build")
            commands.dev = _first_script(scripts, ("dev", "start:dev", "serve"))
            commands.start = _first_script(scripts, ("start", "serve", "start:prod"))

        if context.has_file("Makefile"):
            makefile = context.read_text(context.find_files("Makefile")[0]) or ""
            commands.source = commands.source or "Makefile"
            commands.install = commands.install or _make_target(makefile, ("install", "deps"))
            commands.build = commands.build or _make_target(makefile, ("build",))
            commands.dev = commands.dev or _make_target(makefile, ("dev",))
            commands.start = commands.start or _make_target(makefile, ("start", "run"))

        if context.has_file("manage.py") and not commands.dev:
            commands.source = commands.source or "manage.py"
            commands.dev = "python manage.py runserver"

        result.commands = commands


def _infer_install_command(context: ScanContext, result: ScanResult) -> str | None:
    manager = result.packageManager.primary
    if manager == "pnpm":
        return "pnpm install"
    if manager == "yarn":
        return "yarn install"
    if manager == "bun":
        return "bun install"
    if context.has_file("package.json"):
        return "npm install"
    if context.has_file("requirements.txt"):
        return "pip install -r requirements.txt"
    if context.has_file("pyproject.toml"):
        return "pip install ."
    if context.has_file("composer.json"):
        return "composer install"
    if context.has_file("go.mod"):
        return "go mod download"
    if context.has_file("Cargo.toml"):
        return "cargo build"
    return None


def _first_script(scripts: dict[str, object], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = scripts.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def _make_target(makefile: str, targets: tuple[str, ...]) -> str | None:
    for target in targets:
        if f"{target}:" in makefile:
            return f"make {target}"
    return None
