param(
	[int]$MinClassCount = 50,
	[string]$OutputDir = ""
)

$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"
$ai = Join-Path $repoRoot "backend\components\AIModel\python\ai.py"
$envFile = Join-Path $repoRoot "backend\.env"

if (-not $OutputDir) {
	$OutputDir = Join-Path $repoRoot "backend\components\AIModel\python\model"
}

& $python $ai --env-file $envFile train --output-dir $OutputDir --min-class-count $MinClassCount
