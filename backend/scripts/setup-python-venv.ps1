param(
    [string]$PythonExe = "python"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')
$venvDir = Join-Path $repoRoot '.venv'
$requirementsFile = Join-Path $repoRoot 'backend\components\AIModel\python\requirements.txt'

if (-not (Get-Command $PythonExe -ErrorAction SilentlyContinue)) {
    Write-Error "Python executable not found: $PythonExe"
    exit 1
}

if (-not (Test-Path $venvDir)) {
    Write-Host "Creating venv at $venvDir"
    & $PythonExe -m venv $venvDir
    if ($LASTEXITCODE -ne 0) { Write-Error 'venv creation failed.'; exit 1 }
}

$venvPython = Join-Path $venvDir 'Scripts\python.exe'
Write-Host 'Upgrading pip and installing AI trainer dependencies...'
& $venvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { Write-Error 'pip upgrade failed.'; exit 1 }

& $venvPython -m pip install -r $requirementsFile
if ($LASTEXITCODE -ne 0) { Write-Error 'Dependency install failed.'; exit 1 }

Write-Host "Use this venv with: & $venvDir\Scripts\Activate.ps1"