# Builds the Electron desktop app (installer source).
# Run publish_backend.ps1 FIRST - this packages whatever is already sitting in
# backend-dist/win-x64, stale or not, with no warning.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$backendPublish = "backend-dist/win-x64"
if (-not (Test-Path "$backendPublish/DailyPill.Api.exe")) {
    Write-Warning "$backendPublish/DailyPill.Api.exe not found - run publish_backend.ps1 first, otherwise the installer will have no backend at all."
    $answer = Read-Host "Continue anyway? (y/N)"
    if ($answer -ne "y") { exit 1 }
}

Set-Location frontend
npm run build:electron
