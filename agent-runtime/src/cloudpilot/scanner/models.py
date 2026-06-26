"""Stable JSON schema for CloudPilot repository scan results."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LanguageStat(BaseModel):
    """Language usage derived from file extensions."""

    name: str
    file_count: int
    extensions: list[str] = Field(default_factory=list)


class RepositoryInfo(BaseModel):
    """Basic repository metadata."""

    name: str
    path: str
    is_git_repository: bool = False
    default_branch: str | None = None
    file_count: int = 0
    directory_count: int = 0
    languages: list[LanguageStat] = Field(default_factory=list)
    is_monorepo: bool = False
    monorepo_indicators: list[str] = Field(default_factory=list)


class FrameworkEvidence(BaseModel):
    """A detected framework with supporting evidence."""

    name: str
    category: Literal["frontend", "backend"]
    evidence: list[str] = Field(default_factory=list)


class FrameworksInfo(BaseModel):
    """Detected frontend and backend frameworks."""

    frontend: list[str] = Field(default_factory=list)
    backend: list[str] = Field(default_factory=list)
    detected: list[FrameworkEvidence] = Field(default_factory=list)


class RuntimeEntry(BaseModel):
    """A detected language runtime."""

    name: str
    version: str | None = None
    source_file: str | None = None


class RuntimeInfo(BaseModel):
    """Runtime and version file metadata."""

    primary: str | None = None
    runtimes: list[RuntimeEntry] = Field(default_factory=list)
    version_files: list[str] = Field(default_factory=list)


class PackageManagerInfo(BaseModel):
    """Detected package managers and lock files."""

    primary: str | None = None
    managers: list[str] = Field(default_factory=list)
    lock_files: list[str] = Field(default_factory=list)


class DependencyCategories(BaseModel):
    """Categorized dependency names."""

    frameworks: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    authentication: list[str] = Field(default_factory=list)
    api: list[str] = Field(default_factory=list)
    testing: list[str] = Field(default_factory=list)
    build_tools: list[str] = Field(default_factory=list)


class DependenciesInfo(BaseModel):
    """Dependency names read from manifest files."""

    production: list[str] = Field(default_factory=list)
    development: list[str] = Field(default_factory=list)
    categories: DependencyCategories = Field(default_factory=DependencyCategories)
    source_files: list[str] = Field(default_factory=list)


class DatabaseEntry(BaseModel):
    """A detected database or ORM."""

    name: str
    category: Literal["database", "orm", "cache", "baas"] = "database"
    evidence: list[str] = Field(default_factory=list)


class DatabaseInfo(BaseModel):
    """Database-related libraries and tooling."""

    detected: list[DatabaseEntry] = Field(default_factory=list)


class EnvironmentInfo(BaseModel):
    """Environment variable template metadata (names only)."""

    template_files: list[str] = Field(default_factory=list)
    variables: list[str] = Field(default_factory=list)


class DeploymentFile(BaseModel):
    """A deployment-related file."""

    path: str
    type: str


class DeploymentInfo(BaseModel):
    """Deployment configuration files."""

    files: list[DeploymentFile] = Field(default_factory=list)
    detected_platforms: list[str] = Field(default_factory=list)


class CicdSystem(BaseModel):
    """A detected CI/CD system."""

    name: str
    evidence_files: list[str] = Field(default_factory=list)


class CicdInfo(BaseModel):
    """CI/CD pipeline metadata."""

    systems: list[CicdSystem] = Field(default_factory=list)


class ProjectStructure(BaseModel):
    """Notable top-level or common project folders."""

    folders: list[str] = Field(default_factory=list)


class ArchitectureInfo(BaseModel):
    """High-level project architecture classification."""

    primary: str | None = None
    types: list[str] = Field(default_factory=list)
    structure: ProjectStructure = Field(default_factory=ProjectStructure)


class CommandsInfo(BaseModel):
    """Detected install, build, dev, and start commands."""

    install: str | None = None
    build: str | None = None
    dev: str | None = None
    start: str | None = None
    source: str | None = None


class HealthIssue(BaseModel):
    """A factual deployment-readiness observation."""

    code: str
    message: str
    severity: Literal["info", "warning"] = "warning"


class HealthInfo(BaseModel):
    """Deployment readiness facts (no recommendations)."""

    issues: list[HealthIssue] = Field(default_factory=list)
    has_env_template: bool = False
    has_build_command: bool = False
    has_start_command: bool = False
    has_deployment_files: bool = False
    has_lock_file: bool = False
    has_dockerfile: bool = False


class ScanResult(BaseModel):
    """Complete repository scan output consumed by CloudPilot agents."""

    repository: RepositoryInfo
    frameworks: FrameworksInfo = Field(default_factory=FrameworksInfo)
    runtime: RuntimeInfo = Field(default_factory=RuntimeInfo)
    packageManager: PackageManagerInfo = Field(default_factory=PackageManagerInfo)
    dependencies: DependenciesInfo = Field(default_factory=DependenciesInfo)
    database: DatabaseInfo = Field(default_factory=DatabaseInfo)
    environment: EnvironmentInfo = Field(default_factory=EnvironmentInfo)
    deployment: DeploymentInfo = Field(default_factory=DeploymentInfo)
    cicd: CicdInfo = Field(default_factory=CicdInfo)
    architecture: ArchitectureInfo = Field(default_factory=ArchitectureInfo)
    commands: CommandsInfo = Field(default_factory=CommandsInfo)
    health: HealthInfo = Field(default_factory=HealthInfo)

    def to_json(self, *, indent: int = 2) -> str:
        """Serialize to stable JSON for agent consumption."""
        return self.model_dump_json(indent=indent, exclude_none=True)
