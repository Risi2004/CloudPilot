"""Repository metadata detector."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.knowledge import LANGUAGE_EXTENSIONS
from cloudpilot.scanner.models import LanguageStat, RepositoryInfo, ScanResult


class RepositoryInfoDetector:
    """Extract repository name, counts, languages, and monorepo indicators."""

    name = "repository"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        languages = _detect_languages(context.files)
        is_monorepo, indicators = _detect_monorepo(context)

        result.repository = RepositoryInfo(
            name=context.root.name,
            path=str(context.root),
            is_git_repository=context.git.is_git_repository,
            default_branch=context.git.default_branch,
            file_count=len(context.files),
            directory_count=len(context.directories),
            languages=languages,
            is_monorepo=is_monorepo,
            monorepo_indicators=indicators,
        )


def _detect_languages(files: list[Path]) -> list[LanguageStat]:
    extension_counter: Counter[str] = Counter()
    for file_path in files:
        extension_counter[file_path.suffix.lower()] += 1

    stats: list[LanguageStat] = []
    for language, extensions in LANGUAGE_EXTENSIONS.items():
        count = sum(extension_counter[ext] for ext in extensions)
        if count:
            stats.append(
                LanguageStat(
                    name=language,
                    file_count=count,
                    extensions=extensions,
                )
            )
    return sorted(stats, key=lambda item: item.file_count, reverse=True)


def _detect_monorepo(context: ScanContext) -> tuple[bool, list[str]]:
    indicators: list[str] = []

    if context.has_file("pnpm-workspace.yaml"):
        indicators.append("pnpm-workspace.yaml")
    if context.has_file("lerna.json"):
        indicators.append("lerna.json")
    if context.has_file("nx.json"):
        indicators.append("nx.json")
    if context.has_file("turbo.json"):
        indicators.append("turbo.json")

    package_json = context.root_package_json()
    if package_json and package_json.get("workspaces"):
        indicators.append("package.json workspaces")

    packages_dir = context.root / "packages"
    if packages_dir.is_dir():
        package_count = sum(1 for child in packages_dir.iterdir() if (child / "package.json").is_file())
        if package_count > 1:
            indicators.append("packages/")

    return bool(indicators), indicators
