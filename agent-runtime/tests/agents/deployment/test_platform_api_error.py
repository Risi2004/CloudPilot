"""Platform API error and diagnostic tests."""

from cloudpilot.agents.deployment.errors import PlatformApiError, diagnostic_from_code
from cloudpilot.agents.deployment.phases import DeploymentPhase


def test_platform_api_error_to_diagnostic() -> None:
    exc = PlatformApiError(
        message="Vercel project is not linked to GitHub.",
        code="vercel_missing_repo_link",
        phase=DeploymentPhase.DEPLOYMENT_EXECUTION,
        platform="vercel",
        service_id="frontend",
        http_method="GET",
        http_path="/v9/projects/abc",
        http_status=400,
    )
    diagnostic = exc.to_diagnostic()
    assert diagnostic.code == "vercel_missing_repo_link"
    assert diagnostic.platform == "vercel"
    assert diagnostic.service_id == "frontend"
    assert len(diagnostic.remediation) >= 1


def test_diagnostic_from_code_includes_remediation() -> None:
    diagnostic = diagnostic_from_code(
        "missing_provider_job",
        "No deployment job id.",
        phase=DeploymentPhase.MONITORING,
        platform="render",
        service_id="backend",
    )
    assert diagnostic.phase == "monitoring"
    assert diagnostic.remediation
