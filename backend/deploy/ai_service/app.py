from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib, os

MODEL_PATH = os.environ.get("PYTHON_MODEL_PATH", "/model/heat_advisory_model.joblib")
FEATURE_ORDER = [
    "temperature_c",
    "humidity_percent",
    "wind_speed_mps",
    "pressure_hpa",
    "heat_index_c",
]

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
    scores = dict(zip([str(label) for label in classes], [float(score) for score in probs.tolist()]))
    return {"risk": str(best), "scores": scores}