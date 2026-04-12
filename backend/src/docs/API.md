# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /api/auth/register
Register a new user

#### POST /api/auth/login
Login user

#### POST /api/auth/logout
Logout user

### Heat Index

#### GET /api/heat-index
Get current heat index data

#### GET /api/heat-index/history
Get historical heat index data

#### POST /api/heat-index/calculate
Calculate heat index for specific parameters

### Health Advisory

#### GET /api/health-advisory
Get current health advisories

#### GET /api/health-advisory/:id
Get specific advisory

#### POST /api/health-advisory
Create new advisory (Admin only)

### Weather

#### GET /api/weather/current
Get current weather data

#### POST /api/weather/scheduled/snapshot
Trigger a secure weather snapshot job.

Headers:
```
x-scheduler-token: <WEATHER_SCHEDULER_TOKEN>
```

Body (optional):
```
{
	"lat": 14.575,
	"lon": 121.025
}
```

#### POST /api/weather/scheduled/backfill
Backfill historical weather snapshots for the last N days (max 7).

Headers:
```
x-scheduler-token: <WEATHER_SCHEDULER_TOKEN>
```

Body (optional):
```
{
	"days": 3,
	"lat": 14.575,
	"lon": 121.025
}
```

Notes:
- Uses OpenWeather One Call timemachine endpoint.
- Requires API account access to historical data.

### Schools

#### GET /api/schools
Get all schools

#### GET /api/schools/:id
Get specific school

#### POST /api/schools
Create new school (Admin only)

#### PUT /api/schools/:id
Update school (Admin only)

### Notifications

#### GET /api/notifications
Get user notifications

#### POST /api/notifications/send
Send notification (Admin only)

#### PATCH /api/notifications/:id/read
Mark notification as read
