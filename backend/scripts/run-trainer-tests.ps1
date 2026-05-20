param(
    [string]$PythonExe = "python"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')
$venvPython = Join-Path $repoRoot '.venv\Scripts\python.exe'

if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $pythonCmd = Get-Command $PythonExe -ErrorAction SilentlyContinue
    $python = if ($pythonCmd) { $pythonCmd.Source } else { $null }
}

if (-not $python) {
    Write-Error "Python executable not found: $PythonExe"
    exit 1
}

$testsDir = Join-Path $repoRoot 'backend\components\AIModel\python\tests'

Write-Host 'Running AI trainer unit tests...'
& $python -m unittest discover -s $testsDir -p 'test_*.py'
if ($LASTEXITCODE -ne 0) {
    Write-Error 'AI trainer tests failed.'
    exit $LASTEXITCODE
}

Write-Host 'AI trainer tests passed.'