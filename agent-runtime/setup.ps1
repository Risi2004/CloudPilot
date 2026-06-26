# CloudPilot agent-runtime setup (Windows)
# Creates a virtual environment at C:\cpvenv to avoid Windows MAX_PATH issues
# when installing LiteLLM under long OneDrive project paths.

$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$VenvPath = "C:\cpvenv"

Write-Host "CloudPilot agent-runtime setup"
Write-Host "Project: $ProjectRoot"
Write-Host "Virtualenv: $VenvPath"

if (-not (Test-Path $VenvPath)) {
    python -m venv $VenvPath
}

& "$VenvPath\Scripts\python.exe" -m pip install --upgrade pip
& "$VenvPath\Scripts\python.exe" -m pip install -e $ProjectRoot

Write-Host ""
Write-Host "Setup complete. Verify connectivity with:"
Write-Host "  C:\cpvenv\Scripts\cloudpilot-verify-ai.exe"
