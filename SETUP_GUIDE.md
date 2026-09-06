# Setup Guide

## AI Model Environment

From the repo root, set up the Python venv and trainer dependencies:

```powershell
.\backend\scripts\setup-python-venv.ps1 -PythonExe (Get-Command python).Source
```

Run the trainer tests before retraining:

```powershell
.\backend\scripts\run-trainer-tests.ps1
```

Audit and retrain the model:

```powershell
node .\backend\scripts\audit-training-data.js .\backend\logs\audit-events.jsonl .\backend\data\training_audit_report.json --compare-report .\backend\components\AIModel\python\model\training_report.json
.\backend\scripts\run-retrain.ps1 -MinClassCount 0
```

Package deployment artifacts:

```powershell
.\backend\scripts\package-model-artifacts.ps1
```

Outputs land in `backend/components/AIModel/python/model/` and `backend/deploy/model-release/`.
