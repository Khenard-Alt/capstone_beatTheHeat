param(
    [string]$ModelDir = "backend/components/AIModel/python/model",
    [string]$AuditReport = "backend/data/training_audit_report.json",
    [string]$OutputDir = "backend/deploy/published-models",
    [switch]$AllowNeedsReview
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')
$sourceDir = Join-Path $repoRoot $ModelDir
$auditPath = Join-Path $repoRoot $AuditReport
$publishRoot = Join-Path $repoRoot $OutputDir

if (-not (Test-Path $sourceDir)) {
    Write-Error "Model directory not found: $sourceDir"
    exit 1
}

$registryPath = Join-Path $sourceDir 'model_registry.json'
if (-not (Test-Path $registryPath)) {
    Write-Error "Model registry not found: $registryPath"
    exit 1
}

$registry = Get-Content $registryPath -Raw | ConvertFrom-Json
$status = [string]$registry.status
if ($status -ne 'promoted' -and -not $AllowNeedsReview) {
    Write-Error "Model status is '$status'. Re-run with -AllowNeedsReview to publish anyway."
    exit 1
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$publishDir = Join-Path $publishRoot $timestamp
New-Item -ItemType Directory -Force -Path $publishDir | Out-Null

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
        Copy-Item $source -Destination (Join-Path $publishDir $artifact) -Force
    }
}

if (Test-Path $auditPath) {
    Copy-Item $auditPath -Destination (Join-Path $publishDir 'training_audit_report.json') -Force
}

$manifest = @{
    generatedAt = (Get-Date).ToString('o')
    modelStatus = $status
    sourceDir = $sourceDir
    publishDir = $publishDir
    artifacts = $artifacts
    auditReport = if (Test-Path $auditPath) { 'training_audit_report.json' } else { $null }
} | ConvertTo-Json -Depth 6

Set-Content -Path (Join-Path $publishDir 'promotion_manifest.json') -Value $manifest -Encoding UTF8

Write-Host "Published model artifacts to $publishDir"