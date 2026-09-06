param(
    [string]$ModelDir = "backend/components/AIModel/python/model",
    [string]$Language = "english"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptDir '..\..')

$venvPython = Join-Path $repoRoot '.venv\Scripts\python.exe'
if (Test-Path $venvPython) {
    $python = $venvPython
} else {
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    $python = if ($pythonCmd) { $pythonCmd.Source } else { $null }
}

if (-not $python) {
    Write-Error 'Python not found. Activate your venv or install Python.'
    exit 1
}

$modelPath = Join-Path $repoRoot $ModelDir
$trainer = Join-Path $repoRoot 'backend\components\AIModel\python\ai.py'

if (-not (Test-Path (Join-Path $modelPath 'heat_advisory_model.joblib'))) {
    Write-Error "Model artifacts not found at $modelPath. Run .\backend\scripts\run-retrain.ps1 first."
    exit 1
}

$scenarios = @(
    @{ Name = 'Safe'; Expected = 'safe'; TemperatureC = 27.0; HumidityPercent = 55; WindSpeedMps = 2.5; PressureHpa = 1012; HeatIndexC = 28.0 },
    @{ Name = 'Caution'; Expected = 'caution'; TemperatureC = 31.0; HumidityPercent = 62; WindSpeedMps = 1.8; PressureHpa = 1010; HeatIndexC = 34.0 },
    @{ Name = 'ExtremeCaution'; Expected = 'extreme-caution'; TemperatureC = 34.0; HumidityPercent = 68; WindSpeedMps = 1.2; PressureHpa = 1008; HeatIndexC = 39.0 },
    @{ Name = 'Danger'; Expected = 'danger'; TemperatureC = 36.5; HumidityPercent = 72; WindSpeedMps = 0.9; PressureHpa = 1006; HeatIndexC = 44.0 },
    @{ Name = 'ExtremeDanger'; Expected = 'extreme-danger'; TemperatureC = 39.0; HumidityPercent = 78; WindSpeedMps = 0.5; PressureHpa = 1004; HeatIndexC = 50.0 }
)

$tempDir = Join-Path $env:TEMP 'beat-the-heat-ai-tests'
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$results = @()
$failed = $false

foreach ($scenario in $scenarios) {
    $inputPath = Join-Path $tempDir ("{0}.json" -f $scenario.Name)
    $payload = @{
        temperatureC = $scenario.TemperatureC
        humidityPercent = $scenario.HumidityPercent
        windSpeedMps = $scenario.WindSpeedMps
        pressureHpa = $scenario.PressureHpa
        heatIndexC = $scenario.HeatIndexC
        source = 'smoke-test'
    } | ConvertTo-Json -Depth 4

        Set-Content -Path $inputPath -Value $payload -Encoding Ascii

    $output = & $python $trainer predict --model-dir $modelPath --input-json $inputPath --language $Language 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$($scenario.Name)] ERROR" -ForegroundColor Red
        Write-Host $output
        $failed = $true
        continue
    }

    try {
        $advisory = $output | ConvertFrom-Json
        $actual = [string]$advisory.riskLevel
        $confidence = if ($null -ne $advisory.confidenceScore) { [double]$advisory.confidenceScore } else { 0 }
        $pass = $actual -eq $scenario.Expected
        $results += [pscustomobject]@{
            Scenario = $scenario.Name
            Expected = $scenario.Expected
            Actual = $actual
            Confidence = [math]::Round($confidence, 2)
            Pass = $pass
        }
        if (-not $pass) { $failed = $true }
    } catch {
        Write-Host "[$($scenario.Name)] ERROR: Could not parse prediction output" -ForegroundColor Red
        Write-Host $output
        $failed = $true
    }
}

if ($results.Count -gt 0) {
    $results | Format-Table -AutoSize
}

if ($failed) {
    Write-Error 'One or more AI scenario tests failed.'
    exit 1
}

Write-Host 'All AI scenario tests passed.'
exit 0
