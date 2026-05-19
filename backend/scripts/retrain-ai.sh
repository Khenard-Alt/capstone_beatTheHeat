#!/usr/bin/env bash
set -euo pipefail

MIN_CLASS_COUNT=${1:-50}
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON="$REPO_ROOT/.venv/bin/python"
AI="$REPO_ROOT/backend/components/AIModel/python/ai.py"
ENV_FILE="$REPO_ROOT/backend/.env"
OUTPUT_DIR="$REPO_ROOT/backend/components/AIModel/python/model"

"$PYTHON" "$AI" --env-file "$ENV_FILE" train --output-dir "$OUTPUT_DIR" --min-class-count "$MIN_CLASS_COUNT"
