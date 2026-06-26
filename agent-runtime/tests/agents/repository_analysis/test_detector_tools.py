"""Tests for granular detector tools."""

from __future__ import annotations

import json
from pathlib import Path

from cloudpilot.agents.repository_analysis.tools.architecture_detector import detect_architecture
from cloudpilot.agents.repository_analysis.tools.command_detector import detect_commands
from cloudpilot.agents.repository_analysis.tools.database_detector import detect_databases
from cloudpilot.agents.repository_analysis.tools.dependency_detector import detect_dependencies
from cloudpilot.agents.repository_analysis.tools.deployment_detector import detect_deployment
from cloudpilot.agents.repository_analysis.tools.environment_detector import detect_environment
from cloudpilot.agents.repository_analysis.tools.framework_detector import detect_frameworks
from cloudpilot.agents.repository_analysis.tools.health_detector import detect_health
from cloudpilot.agents.repository_analysis.tools.package_manager_detector import detect_package_manager
from cloudpilot.agents.repository_analysis.tools.repository_info_detector import detect_repository_info
from cloudpilot.agents.repository_analysis.tools.runtime_detector import detect_runtime
from cloudpilot.agents.repository_analysis.utils import session_keys
from cloudpilot.scanner.scan_session import clear_all


def _express_repo(tmp_path: Path) -> Path:
    root = tmp_path / "express-api"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps({"dependencies": {"express": "^4.0.0", "mongoose": "^8.0.0"}}),
        encoding="utf-8",
    )
    (root / "Dockerfile").write_text("FROM node:20", encoding="utf-8")
    (root / ".env.example").write_text("DATABASE_URL=\n", encoding="utf-8")
    workflows = root / ".github" / "workflows"
    workflows.mkdir(parents=True)
    (workflows / "ci.yml").write_text("name: CI", encoding="utf-8")
    return root


def test_framework_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    result = detect_frameworks(str(root))
    assert "express" in result["frameworks"]["backend"]


def test_dependency_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    result = detect_dependencies(str(root))
    assert "express" in result["dependencies"]["production"]


def test_runtime_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    result = detect_runtime(str(root))
    assert result["runtime"]["primary"] == "node.js"


def test_database_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    result = detect_databases(str(root))
    assert any(item["name"] == "Mongoose" for item in result["database"]["detected"])


def test_deployment_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    result = detect_deployment(str(root))
    assert "docker" in result["deployment"]["detected_platforms"]
    assert any(item["name"] == "GitHub Actions" for item in result["cicd"]["systems"])


def test_environment_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    result = detect_environment(str(root))
    assert "DATABASE_URL" in result["environment"]["variables"]


def test_architecture_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    result = detect_architecture(str(root))
    assert "api_server" in result["architecture"]["types"]


def test_command_detector_tool(tmp_path: Path) -> None:
    root = _express_repo(tmp_path)
    (root / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"express": "^4.0.0"},
                "scripts": {"start": "node server.js"},
            }
        ),
        encoding="utf-8",
    )
    result = detect_commands(str(root))
    assert result["commands"]["start"] == "node server.js"


def test_health_detector_tool(tmp_path: Path) -> None:
    clear_all()
    root = _express_repo(tmp_path)
    result = detect_health(str(root))
    assert "issues" in result["health"]
    assert isinstance(result["health"]["has_dockerfile"], bool)


def test_package_manager_detector_tool(tmp_path: Path) -> None:
    clear_all()
    root = _express_repo(tmp_path)
    result = detect_package_manager(str(root))
    assert "managers" in result["packageManager"]


def test_repository_info_detector_tool(tmp_path: Path) -> None:
    clear_all()
    root = _express_repo(tmp_path)
    result = detect_repository_info(str(root))
    assert result["repository"]["name"] == "express-api"


def test_detector_tools_reuse_session_path(tmp_path: Path) -> None:
    clear_all()
    root = _express_repo(tmp_path)

    class FakeToolContext:
        def __init__(self) -> None:
            self.state: dict[str, str] = {}

    context = FakeToolContext()
    context.state[session_keys.REPO_PATH] = str(root)

    frameworks = detect_frameworks(tool_context=context)
    runtime = detect_runtime(tool_context=context)

    assert "express" in frameworks["frameworks"]["backend"]
    assert runtime["runtime"]["primary"] == "node.js"
