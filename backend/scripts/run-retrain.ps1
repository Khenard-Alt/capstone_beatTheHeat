param(
    [string]$AuditPath = "backend/logs/audit-events.jsonl",
    [string]$DataDir = "backend/data",
    [int]$MinClassCount = 10,
    [switch]$Tune
)

Write-Host "Starting retrain pipeline..."

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Write-Error "Node.js not found in PATH."; exit 1 }

$exportScript = Join-Path $repoRoot 'backend\scripts\export-training.js'
$convertScript = Join-Path $repoRoot 'backend\scripts\export-to-model-csv.js'
$requirementsFile = Join-Path $repoRoot 'backend\components\AIModel\python\requirements.txt'
$auditFile = Join-Path $repoRoot $AuditPath
$dataDirPath = Join-Path $repoRoot $DataDir

Write-Host "Exporting audit logs to training JSONL..."
& node $exportScript $auditFile $dataDirPath --no-redact
if ($LASTEXITCODE -ne 0) { Write-Error "export-training failed."; exit 1 }

Write-Host "Converting export to model CSV..."
& node $convertScript (Join-Path $dataDirPath 'training_export.jsonl') (Join-Path $dataDirPath 'model_training.csv') --balance --balance-target=25
if ($LASTEXITCODE -ne 0) { Write-Error "export-to-model-csv failed."; exit 1 }

# Locate python executable (prefer .venv)
$venvPython = Join-Path $repoRoot '.venv\Scripts\python.exe'
if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    $python = if ($pythonCmd) { $pythonCmd.Source } else { $null }
}

if (-not $python) { Write-Error "Python not found. Activate your venv or install Python."; exit 1 }

if (Test-Path $requirementsFile) {
    Write-Host "Ensuring Python dependencies are installed..."
    & $python -m pip install -r $requirementsFile
    if ($LASTEXITCODE -ne 0) { Write-Error "Dependency installation failed."; exit 1 }
}

# Set loky max cpu count to number of logical processors to avoid loky wmic warnings on Windows
try {
    $Env:LOKY_MAX_CPU_COUNT = [Environment]::ProcessorCount.ToString()
} catch {
    # ignore
}

$trainer = Join-Path $repoRoot 'backend\components\AIModel\python\ai.py'
Write-Host "Training model using CSV: $(Join-Path $dataDirPath 'model_training.csv')"
$args = @('train', '--train-csv', (Join-Path $dataDirPath 'model_training.csv'), '--output-dir', (Join-Path $repoRoot 'backend\components\AIModel\python\model'), '--min-class-count', $MinClassCount, '--apply-best')
if ($Tune) { $args += '--tune' }
& $python $trainer $args
$code = $LASTEXITCODE
if ($code -ne 0) { Write-Error "Training failed with exit code $code"; exit $code }

Write-Host "Retrain complete. Artifacts in backend/components/AIModel/python/model"
exit 0
