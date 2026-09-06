## Deployment (easy step-by-step)

This document gives copy-paste commands and short explanations so you can make the project "ready to deploy" and run it on a VPS (Hostinger or similar). It covers: model artifact, frontend, backend, a small FastAPI inference service, Docker Compose smoke test, and VPS commands.

STEP 0 — prerequisites
- Git repo cloned and up to date.
- Docker installed for local smoke tests / VPS (or run without Docker during dev).
- Production secrets prepared: `DATABASE_URL`, `JWT_SECRET`, SMTP creds, Supabase keys.

----

STEP 1 — check or create the trained model artifact
1. Check whether the model already exists (Windows PowerShell):

```powershell
Test-Path .\backend\components\AIModel\python\model\heat_advisory_model.joblib
```

2. If `False`, train/package it locally (Linux / macOS / WSL):

```bash
# From the Python trainer folder — place the `--env-file` BEFORE the subcommand
cd backend/components/AIModel/python
python ai.py --env-file ../../../.env train --output-dir model
# OR run the packaging script from repo root (Windows PowerShell):
cd .\ && backend\scripts\package-model-artifacts.ps1
``` 

3. Verify files:

```bash
ls backend/components/AIModel/python/model
# expect: heat_advisory_model.joblib  model_registry.json  training_report.json
```

Tip: For production, prefer uploading `heat_advisory_model.joblib` to object storage (S3/GCS) and use the model URL in your CI/deploy rather than committing the file to Git.

----

STEP 2 — build the frontend (creates `frontend/dist`)
1. Install and build:

```bash
cd frontend
npm ci
npm run build
```

2. Confirm output:

```bash
ls dist
# expect index.html and asset files
```

If build fails, inspect console output for missing env vars or TypeScript errors and fix them first.

----

STEP 3 — build the backend (TypeScript)
1. From repo root (or `backend`):

```bash
cd backend
npm ci
npm run build
```

2. Run tests (optional but recommended):

```bash
npm test
```

If `npm test` reports parse errors (example: syntax error in `backend/src/controllers/announcementsController.ts`) open the file and fix the TypeScript error, then re-run tests.

----

STEP 4 — create the AI inference microservice (FastAPI)
Create folder: `backend/deploy/ai_service`

Files to create:

- `backend/deploy/ai_service/app.py` (simple server):

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib, os

MODEL_PATH = os.environ.get("PYTHON_MODEL_PATH", "/model/heat_advisory_model.joblib")
FEATURE_ORDER = ["temperature_c", "humidity_percent", "wind_speed_mps", "pressure_hpa", "heat_index_c"]

app = FastAPI()

class PredictIn(BaseModel):
    features: dict

class PredictOut(BaseModel):
    risk: str
    scores: dict

model = None

@app.on_event("startup")
def load_model():
    global model
    model = joblib.load(MODEL_PATH)

@app.get("/health")
def health():
  return {"ok": True, "modelLoaded": model is not None}


@app.post("/predict", response_model=PredictOut)
def predict(payload: PredictIn):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
  X = [[payload.features.get(name, 0) for name in FEATURE_ORDER]]
    probs = model.predict_proba(X)[0]
    classes = list(model.classes_)
    best = classes[int(probs.argmax())]
    return {"risk": best, "scores": dict(zip(classes, probs.tolist()))}
```

Important: the feature keys should be sent in this order when testing manually:

```json
{
  "temperature_c": 34.0,
  "humidity_percent": 70,
  "wind_speed_mps": 2.0,
  "pressure_hpa": 1010,
  "heat_index_c": 44.0
}
```

The response should look like this:

```json
{
  "risk": "2",
  "scores": {
    "0": 0.12,
    "1": 0.23,
    "2": 0.65
  }
}
```

- `backend/deploy/ai_service/requirements.txt` — copy `backend/components/AIModel/python/requirements.txt` into this file.
- `backend/deploy/ai_service/Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
```

Quick local run (no Docker):

```bash
cd backend/deploy/ai_service
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
```

Test (PowerShell example — adapt fields to the model's expected features):

```powershell
$uri = "http://localhost:8001/predict"
$headers = @{ "Content-Type" = "application/json" }
$body = @{
  features = @{
    temperature_c = 34.0
    humidity_percent = 70
    wind_speed_mps = 2.0
    pressure_hpa = 1010
    heat_index_c = 44.0
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
```

Or, if you prefer the real curl binary:

```powershell
curl.exe -X POST "http://localhost:8001/predict" -H "Content-Type: application/json" -d "{\"features\":{\"temperature_c\":34.0,\"humidity_percent\":70,\"wind_speed_mps\":2.0,\"pressure_hpa\":1010,\"heat_index_c\":44.0}}"
```

----

STEP 5 — Docker Compose smoke test (local)
Create `backend/deploy/docker-compose.yml` (or place the file at this path) with this content:

```yaml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "8000:8000"

  ai_service:
    build:
      context: ./backend/deploy/ai_service
    volumes:
      - ./backend/components/AIModel/python/model:/model:ro
    environment:
      - PYTHON_MODEL_PATH=/model/heat_advisory_model.joblib
    ports:
      - "8001:8001"

  nginx:
    image: nginx:stable
    ports:
      - "80:80"
    volumes:
      - ./deploy/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - ai_service

networks:
  default:
    driver: bridge
```

Start everything locally:

```bash
# from repo root
docker compose -f backend/deploy/docker-compose.yml up --build
```

Check services:

```bash
curl http://localhost          # frontend
curl http://localhost:8000/api/healthz   # backend, if available
curl -X POST http://localhost/ai/predict -H "Content-Type: application/json" -d '{"features":{...}}'
```

If the ai `predict` URL is proxied through nginx at `/ai/`, use `http://localhost/ai/predict`.

----

STEP 6 — deploy to a Hostinger VPS (exact commands)
1. Install required packages on VPS (Ubuntu 22.04 example):

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git nginx certbot
sudo systemctl enable --now docker
```

Run the SSH command from your local machine first, not inside the VPS shell:

```bash
ssh user@YOUR_VPS_IP
```

2. Prepare the app on the server:

```bash
sudo mkdir -p /opt/beatTheHeat && sudo chown $USER /opt/beatTheHeat
cd /opt/beatTheHeat
git clone https://github.com/Khenard-Alt/capstone_beatTheHeat .
# Upload/copy the model to the path used by compose:
mkdir -p backend/components/AIModel/python/model
# Example: scp from local machine
# scp ./backend/components/AIModel/python/model/heat_advisory_model.joblib user@YOUR_VPS_IP:/opt/beatTheHeat/backend/components/AIModel/python/model/
```

3. Start services on VPS:

```bash
cd /opt/beatTheHeat
# This uses `backend/deploy/docker-compose.yml` in the repository.
docker compose -f backend/deploy/docker-compose.yml up -d --build
```

4. Obtain TLS certificate (Certbot + nginx):

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

If Certbot cannot find the server blocks, place the `deploy/nginx/conf.d/beatTheHeat.conf` content into `/etc/nginx/conf.d/` and reload nginx.

----

STEP 7 — production checklist and notes
- Do NOT keep large binary model files in Git; use object storage or Git LFS instead.
- Use a `.env` file on the VPS with strict permissions (chmod 600) or a secrets manager for credentials.
- Add health checks and resource limits for containers in `docker-compose.yml`.
- Monitor logs with `docker compose logs -f` and integrate with a logging/alerts system.

----

If you want, I can now create the `backend/deploy/ai_service` files and the `deploy/docker-compose.yml` + `deploy/nginx/conf.d/beatTheHeat.conf` in this repo so you can run the local smoke test. Tell me which step to do next.
