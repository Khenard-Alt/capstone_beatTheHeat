# Beat The Heat Backend

## AI Trainer Workflow

Use these scripts for dataset auditing, retraining, and packaging:

```powershell
.\backend\scripts\setup-python-venv.ps1
.\backend\scripts\run-trainer-tests.ps1
.\backend\scripts\audit-training-data.js .\backend\logs\audit-events.jsonl .\backend\data\training_audit_report.json --compare-report .\backend\components\AIModel\python\model\training_report.json
.\backend\scripts\run-retrain.ps1 -MinClassCount 0
.\backend\scripts\promote-model.ps1
.\backend\scripts\package-model-artifacts.ps1
```

The retrain job writes `training_report.json`, `model_registry.json`, and release archives under `backend/deploy/model-release/`.

### Local Trainer Runbook

1. Create or refresh the Python venv:

```powershell
.\backend\scripts\setup-python-venv.ps1 -PythonExe (Get-Command python).Source
```

2. Run the trainer unit tests:

```powershell
.\backend\scripts\run-trainer-tests.ps1
```

3. Audit the latest `ai_analysis` events:

```powershell
node .\backend\scripts\audit-training-data.js .\backend\logs\audit-events.jsonl .\backend\data\training_audit_report.json --compare-report .\backend\components\AIModel\python\model\training_report.json
```

4. Retrain and package artifacts:

```powershell
.\backend\scripts\run-retrain.ps1 -MinClassCount 0
.\backend\scripts\promote-model.ps1
.\backend\scripts\package-model-artifacts.ps1
```

Expected outputs:
- `backend/components/AIModel/python/model/training_report.json`
- `backend/components/AIModel/python/model/model_registry.json`
- `backend/deploy/published-models/*/promotion_manifest.json`
- `backend/deploy/model-release/*.zip`

## Always-On Weather Updates (Defense-Ready)

This backend supports secure scheduler endpoints so weather snapshots continue even when no user is browsing the UI.

### 1) Required Environment Variables

Set these in backend `.env`:

```
OPENWEATHER_API_KEY=your_openweather_key
WEATHER_SCHEDULER_TOKEN=your_long_random_secret
WEATHER_SNAPSHOT_INTERVAL_MINUTES=15
```

### 2) Secure Scheduler Endpoints

- `POST /api/weather/scheduled/snapshot`
- `POST /api/weather/scheduled/backfill`

Both require:

```
x-scheduler-token: <WEATHER_SCHEDULER_TOKEN>
```

### 3) Cron Example (Every 15 Minutes)

Linux crontab:

```bash
*/15 * * * * curl -s -X POST "https://your-domain/api/weather/scheduled/snapshot" -H "x-scheduler-token: YOUR_TOKEN" -H "Content-Type: application/json" >/dev/null 2>&1
```

Windows Task Scheduler (PowerShell action):

```powershell
Invoke-RestMethod "https://your-domain/api/weather/scheduled/snapshot" -Method Post -Headers @{"x-scheduler-token"="YOUR_TOKEN"}
```

### 4) Optional Historical Backfill Command

Backfill last 3 days:

```bash
curl -X POST "https://your-domain/api/weather/scheduled/backfill" \
	-H "x-scheduler-token: YOUR_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"days":3,"intervalHours":3}'
```

Backfill last 7 days:

```bash
curl -X POST "https://your-domain/api/weather/scheduled/backfill" \
	-H "x-scheduler-token: YOUR_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"days":7,"intervalHours":3}'
```

More frequent points (hourly) for the last 3 days:

```bash
curl -X POST "https://your-domain/api/weather/scheduled/backfill" \
	-H "x-scheduler-token: YOUR_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"days":3,"intervalHours":1}'
```

Notes:
- Historical backfill depends on OpenWeather account access to `onecall/timemachine`.
- If access is not enabled, the endpoint returns failures and no fake historical data is inserted.
- `intervalHours` controls the sampling stride across hourly historical points (1 = every hour, 3 = every 3 hours).
