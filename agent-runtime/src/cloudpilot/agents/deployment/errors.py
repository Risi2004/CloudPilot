"""Structured deployment errors and diagnostics."""

from __future__ import annotations

from cloudpilot.agents.deployment.models import DeploymentDiagnostic
from cloudpilot.agents.deployment.phases import DeploymentPhase

_REMEDIATION: dict[str, list[str]] = {
    "vercel_missing_repo_link": [
        "Install the Vercel GitHub integration for your Vercel account.",
        "In the Vercel dashboard, connect the repository and confirm the project shows a linked GitHub repo.",
        "Retry deployment after the project link is active.",
    ],
    "vercel_empty_deployment_id": [
        "Verify your Vercel API token has deployment permissions.",
        "Confirm the Vercel project exists and is linked to GitHub.",
        "Check Vercel dashboard for pending deployment errors.",
    ],
    "render_empty_deploy_id": [
        "Verify your Render API key is valid and has service deploy permissions.",
        "Confirm the Render service exists in your dashboard.",
        "Retry execute after checking Render service status.",
    ],
    "missing_provider_job": [
        "Re-run deployment execute for the affected service.",
        "Check prior step logs in the deployment progress panel.",
        "If execute was interrupted, resume from the deployment session.",
    ],
    "missing_provider_resource": [
        "Re-run deployment execute to provision the service.",
        "Verify platform credentials are still valid.",
    ],
    "invalid_credentials": [
        "Re-enter your platform API credentials in the deployment inputs form.",
        "Confirm the token or API key has not expired or been revoked.",
    ],
    "poll_stuck": [
        "Inspect the platform dashboard for build/deploy status.",
        "Use Analyze Failure for documentation-backed suggestions.",
        "Retry after fixing build or configuration errors.",
    ],
    "platform_api_error": [
        "Review the API error message and HTTP status.",
        "Confirm payload settings match platform documentation.",
        "Retry after correcting credentials or project configuration.",
    ],
    "invalid_repo_url": [
        "Provide a valid GitHub repository URL (https://github.com/owner/repo).",
    ],
    "dependency_not_live": [
        "Wait for the prior service in the deployment sequence to reach live status.",
        "Poll deployment status until the dependency URL is available.",
    ],
}


class PlatformApiError(Exception):
    """Raised when a platform HTTP API call fails."""

    def __init__(
        self,
        *,
        message: str,
        code: str = "platform_api_error",
        phase: DeploymentPhase = DeploymentPhase.DEPLOYMENT_EXECUTION,
        platform: str | None = None,
        service_id: str | None = None,
        http_method: str | None = None,
        http_path: str | None = None,
        http_status: int | None = None,
        api_error: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.phase = phase
        self.platform = platform
        self.service_id = service_id
        self.http_method = http_method
        self.http_path = http_path
        self.http_status = http_status
        self.api_error = api_error or message

    def to_diagnostic(self) -> DeploymentDiagnostic:
        remediation = list(_REMEDIATION.get(self.code, _REMEDIATION["platform_api_error"]))
        return DeploymentDiagnostic(
            phase=self.phase.value,
            code=self.code,
            message=str(self),
            platform=self.platform,
            service_id=self.service_id,
            http_method=self.http_method,
            http_path=self.http_path,
            http_status=self.http_status,
            api_error=self.api_error,
            remediation=remediation,
        )


def diagnostic_from_code(
    code: str,
    message: str,
    *,
    phase: DeploymentPhase,
    platform: str | None = None,
    service_id: str | None = None,
) -> DeploymentDiagnostic:
    return DeploymentDiagnostic(
        phase=phase.value,
        code=code,
        message=message,
        platform=platform,
        service_id=service_id,
        remediation=list(_REMEDIATION.get(code, _REMEDIATION["platform_api_error"])),
    )
