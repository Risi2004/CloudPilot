"""CI/CD detection."""

from __future__ import annotations

from cloudpilot.scanner.context import ScanContext
from cloudpilot.scanner.models import CicdInfo, CicdSystem, ScanResult


class CicdDetector:
    """Detect CI/CD systems from pipeline files."""

    name = "cicd"

    def detect(self, context: ScanContext, result: ScanResult) -> None:
        systems: list[CicdSystem] = []

        github_actions = [
            path.as_posix()
            for path in context.files
            if len(path.parts) >= 3 and path.parts[0] == ".github" and path.parts[1] == "workflows"
        ]
        if github_actions:
            systems.append(CicdSystem(name="GitHub Actions", evidence_files=sorted(github_actions)))

        if context.has_file(".gitlab-ci.yml"):
            systems.append(CicdSystem(name="GitLab CI", evidence_files=[".gitlab-ci.yml"]))

        azure_files = [path.as_posix() for path in context.find_files("azure-pipelines.yml")]
        if azure_files:
            systems.append(CicdSystem(name="Azure Pipelines", evidence_files=azure_files))

        jenkins_files = [path.as_posix() for path in context.find_files("Jenkinsfile")]
        if jenkins_files:
            systems.append(CicdSystem(name="Jenkins", evidence_files=jenkins_files))

        circle_files = [
            path.as_posix()
            for path in context.files
            if path.parts[:2] == (".circleci", "config.yml") or path.as_posix() == ".circleci/config.yml"
        ]
        if circle_files:
            systems.append(CicdSystem(name="CircleCI", evidence_files=sorted(circle_files)))

        result.cicd = CicdInfo(systems=systems)
