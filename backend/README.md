# Beat The Heat Backend

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
	-d '{"days":3}'
```

Backfill last 7 days:

```bash
curl -X POST "https://your-domain/api/weather/scheduled/backfill" \
	-H "x-scheduler-token: YOUR_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"days":7}'
```

Notes:
- Historical backfill depends on OpenWeather account access to `onecall/timemachine`.
- If access is not enabled, the endpoint returns failures and no fake historical data is inserted.
