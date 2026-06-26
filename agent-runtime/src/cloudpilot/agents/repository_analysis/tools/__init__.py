"""Repository Analysis Agent tools."""

from cloudpilot.agents.repository_analysis.tools.architecture_detector import detect_architecture
from cloudpilot.agents.repository_analysis.tools.command_detector import detect_commands
from cloudpilot.agents.repository_analysis.tools.database_detector import detect_databases
from cloudpilot.agents.repository_analysis.tools.dependency_detector import detect_dependencies
from cloudpilot.agents.repository_analysis.tools.deployment_detector import detect_deployment
from cloudpilot.agents.repository_analysis.tools.environment_detector import detect_environment
from cloudpilot.agents.repository_analysis.tools.framework_detector import detect_frameworks
from cloudpilot.agents.repository_analysis.tools.github_tool import clone_github_repo
from cloudpilot.agents.repository_analysis.tools.health_detector import detect_health
from cloudpilot.agents.repository_analysis.tools.package_manager_detector import detect_package_manager
from cloudpilot.agents.repository_analysis.tools.report_builder import build_report
from cloudpilot.agents.repository_analysis.tools.repository_info_detector import detect_repository_info
from cloudpilot.agents.repository_analysis.tools.repository_scanner import scan_repository
from cloudpilot.agents.repository_analysis.tools.runtime_detector import detect_runtime

ALL_TOOLS = [
    clone_github_repo,
    scan_repository,
    detect_repository_info,
    detect_frameworks,
    detect_dependencies,
    detect_runtime,
    detect_package_manager,
    detect_databases,
    detect_deployment,
    detect_environment,
    detect_architecture,
    detect_commands,
    detect_health,
    build_report,
]

__all__ = [
    "ALL_TOOLS",
    "build_report",
    "clone_github_repo",
    "detect_architecture",
    "detect_commands",
    "detect_databases",
    "detect_dependencies",
    "detect_deployment",
    "detect_environment",
    "detect_frameworks",
    "detect_health",
    "detect_package_manager",
    "detect_repository_info",
    "detect_runtime",
    "scan_repository",
]
