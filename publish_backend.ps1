# Publishes the backend for Windows distribution.
# Run this BEFORE build_electron.ps1 (which packages this output into the installer).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Warning "$envFile not found at the repo root - the packaged app will bundle no .env at all, and the backend will fall back to its built-in defaults (OLLAMA_MODEL/OLLAMA_BASE_URL/API_PORT/...). Copy .env.example and fill it in first."
    $answer = Read-Host "Continue anyway? (y/N)"
    if ($answer -ne "y") { exit 1 }
}

# --self-contained true + PublishSingleFile: bundles the matching .NET runtime (collapsed
# into one exe) with the app, so end users don't need anything preinstalled. See
# frontend/package.json's "build:backend" script for the exact dotnet publish invocation
# this wraps.
Set-Location frontend
npm run build:backend
