param(
    [string]$ModelDir = "backend/components/AIModel/python/model",
    [string]$OutputDir = "backend/deploy/model-release"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')
$sourceDir = Join-Path $repoRoot $ModelDir
$releaseRoot = Join-Path $repoRoot $OutputDir
$releaseDir = Join-Path $releaseRoot (Get-Date -Format 'yyyyMMdd-HHmmss')

if (-not (Test-Path $sourceDir)) {
    Write-Error "Model directory not found: $sourceDir"
    exit 1
}

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$artifacts = @(
    'heat_advisory_model.joblib',
    'label_map.json',
    'training_report.json',
    'tuning_report.json',
    'model_registry.json'
)

foreach ($artifact in $artifacts) {
    $source = Join-Path $sourceDir $artifact
    if (Test-Path $source) {
        Copy-Item $source -Destination (Join-Path $releaseDir $artifact) -Force
    }
}

$manifest = @{
    generatedAt = (Get-Date).ToString('o')
    sourceDir = $sourceDir
    releaseDir = $releaseDir
    artifacts = $artifacts
} | ConvertTo-Json -Depth 5

$manifestPath = Join-Path $releaseDir 'deployment_manifest.json'
Set-Content -Path $manifestPath -Value $manifest -Encoding UTF8

$zipPath = Join-Path $releaseRoot ('model-release-{0}.zip' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
Compress-Archive -Path (Join-Path $releaseDir '*') -DestinationPath $zipPath -Force

Write-Host "Packaged model artifacts to $releaseDir"
Write-Host "Created archive $zipPath"