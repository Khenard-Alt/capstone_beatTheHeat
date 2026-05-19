"""Train and run a heat advisory classifier.

This module trains a lightweight model that predicts heat risk level from
weather + heat index data, then builds an advisory payload compatible with
the backend AdvisoryResult schema.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report
from sklearn.model_selection import TimeSeriesSplit
from sklearn.utils.class_weight import compute_class_weight
from xgboost import XGBClassifier


RISK_LEVELS = ["safe", "caution", "extreme-caution", "danger", "extreme-danger"]


TEMPLATES = {
	"english": {
		"safe": {
			"summary": "Heat conditions are within the safe range. Normal school activities may continue.",
			"actions": [
				"Continue regular classes and outdoor activities with normal hydration reminders.",
				"Monitor students who are heat-sensitive for early warning signs.",
			],
			"safetyTips": [
				"Encourage water breaks every 30 to 60 minutes.",
				"Provide shaded areas for outdoor activities when possible.",
			],
		},
		"caution": {
			"summary": "Heat conditions require caution. Adjust outdoor activities and hydration practices.",
			"actions": [
				"Reduce the duration of outdoor activities during peak heat hours.",
				"Increase water break frequency and check on at-risk students.",
			],
			"safetyTips": [
				"Schedule outdoor activities earlier in the day if possible.",
				"Watch for dizziness, nausea, or unusual fatigue.",
			],
		},
		"extreme-caution": {
			"summary": "Heat conditions are high-risk. Limit outdoor exposure and enforce cooling measures.",
			"actions": [
				"Move PE and assemblies to shaded or indoor areas.",
				"Enforce frequent cooling breaks and hydration checks.",
			],
			"safetyTips": [
				"Use fans or cooling stations where available.",
				"Keep emergency contacts ready for heat-related symptoms.",
			],
		},
		"danger": {
			"summary": "Heat conditions are dangerous. Avoid outdoor activities and prioritize safety.",
			"actions": [
				"Suspend outdoor activities and strenuous tasks.",
				"Coordinate with school leadership on possible schedule adjustments.",
			],
			"safetyTips": [
				"Monitor students closely for heat exhaustion signs.",
				"Ensure access to cool indoor spaces and water.",
			],
		},
		"extreme-danger": {
			"summary": "Heat conditions are extremely dangerous. Follow emergency heat protocols.",
			"actions": [
				"Cancel outdoor activities and keep students indoors.",
				"Follow school emergency heat response procedures.",
			],
			"safetyTips": [
				"Call medical assistance for heat stroke symptoms.",
				"Continue cooling measures until conditions improve.",
			],
		},
	},
	"tagalog": {
		"safe": {
			"summary": "Ligtas ang init ngayon. Maaaring ituloy ang normal na school activities.",
			"actions": [
				"Ipatupad ang regular na klase at outdoor activities na may paalala sa hydration.",
				"Bantayan ang mga estudyanteng sensitibo sa init.",
			],
			"safetyTips": [
				"Magpa-water break kada 30 hanggang 60 minuto.",
				"Magbigay ng lilim kapag may outdoor activity.",
			],
		},
		"caution": {
			"summary": "May pag-iingat sa init. Ayusin ang outdoor activities at hydration.",
			"actions": [
				"Bawasan ang tagal ng outdoor activities sa peak heat.",
				"Dagdagan ang water breaks at bantayan ang at-risk students.",
			],
			"safetyTips": [
				"Ilipat ang outdoor activities sa mas maagang oras.",
				"Bantayan ang hilo, pagkahilo, o matinding pagod.",
			],
		},
		"extreme-caution": {
			"summary": "Mataas ang panganib sa init. Limitahan ang outdoor exposure.",
			"actions": [
				"Ilipat ang PE at assemblies sa indoor o shaded areas.",
				"Magbigay ng madalas na cooling breaks at hydration checks.",
			],
			"safetyTips": [
				"Gumamit ng fan o cooling station kung meron.",
				"Ihanda ang emergency contacts para sa heat symptoms.",
			],
		},
		"danger": {
			"summary": "Delikado ang init. Iwasan ang outdoor activities at unahin ang kaligtasan.",
			"actions": [
				"Itigil ang outdoor activities at mabibigat na gawain.",
				"Makipag-ugnayan sa school leadership para sa schedule adjustment.",
			],
			"safetyTips": [
				"Bantayan ang heat exhaustion signs.",
				"Siguraduhing may malamig na indoor areas at tubig.",
			],
		},
		"extreme-danger": {
			"summary": "Lubhang delikado ang init. Sundin ang emergency heat protocols.",
			"actions": [
				"Kanselahin ang outdoor activities at panatilihin sa loob ang mga estudyante.",
				"Sundin ang emergency response ng paaralan.",
			],
			"safetyTips": [
				"Tumawag ng medical assistance kapag may heat stroke symptoms.",
				"Ituloy ang cooling measures hanggang bumaba ang init.",
			],
		},
	},
}


@dataclass
class AdvisoryOutput:
	summary: str
	riskLevel: str
	actions: List[str]
	safetyTips: List[str]
	scopeNote: str
	confidenceScore: float
	decisionBasis: Dict[str, object]
	modelProfile: Dict[str, str]


def load_env_file(env_path: Path) -> None:
	if not env_path.exists():
		return

	# Handle UTF-16 .env files from some Windows editors.
	for encoding in ("utf-8-sig", "utf-16", "utf-16-le", "utf-16-be"):
		try:
			content = env_path.read_text(encoding=encoding)
			break
		except UnicodeError:
			content = None
	if content is None:
		content = env_path.read_text(encoding="utf-8", errors="ignore")

	for line in content.splitlines():
		stripped = line.strip()
		if not stripped or stripped.startswith("#"):
			continue
		key, _, value = stripped.partition("=")
		if key and (key not in os.environ or not os.environ.get(key)):
			os.environ[key] = value


def get_database_url(explicit: str | None = None) -> str:
	if explicit:
		return explicit
	env_url = os.environ.get("DATABASE_URL")
	if env_url:
		return env_url
	raise RuntimeError("DATABASE_URL is not set. Provide --db-url or set env variable.")


def fetch_training_rows(db_url: str) -> List[Dict[str, object]]:
	query = """
		select
			w.temperature_c as temperature_c,
			w.humidity_percent as humidity_percent,
			w.wind_speed_mps as wind_speed_mps,
			w.pressure_hpa as pressure_hpa,
			h.heat_index_c as heat_index_c,
			h.heat_level as heat_level,
			h.observed_at as observed_at
		from public.weather_data w
		join public.heat_index_logs h on h.weather_data_id = w.id
		where h.heat_level is not null
		  and w.temperature_c is not null
		  and w.humidity_percent is not null
		  and w.wind_speed_mps is not null
		  and w.pressure_hpa is not null
		  and h.heat_index_c is not null
		  and h.observed_at is not null
	"""
	with psycopg2.connect(db_url) as conn:
		with conn.cursor(cursor_factory=RealDictCursor) as cur:
			cur.execute(query)
			rows = cur.fetchall()
	return rows


def build_dataset(rows: List[Dict[str, object]]) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
	if not rows:
		raise RuntimeError("No training data found in weather_data + heat_index_logs.")
	df = pd.DataFrame(rows)
	df = df[df["heat_level"].isin(RISK_LEVELS)]
	if df.empty:
		raise RuntimeError("No rows with supported heat_level values.")

	df["observed_at"] = pd.to_datetime(df["observed_at"], errors="coerce")
	df = df.dropna(subset=["observed_at"]).sort_values("observed_at")
	if df.empty:
		raise RuntimeError("No rows with valid observed_at timestamps.")

	features = df[["temperature_c", "humidity_percent", "wind_speed_mps", "pressure_hpa", "heat_index_c"]]
	labels = df["heat_level"].astype(str)
	timestamps = df["observed_at"]
	return features, labels, timestamps


def summarize_class_counts(labels: pd.Series) -> Dict[str, int]:
	counts = labels.value_counts().to_dict()
	return {level: int(counts.get(level, 0)) for level in RISK_LEVELS}


def should_skip_training(class_counts: Dict[str, int], min_class_count: int) -> bool:
	if min_class_count <= 0:
		return False
	return any(count < min_class_count for count in class_counts.values())


def train_model(
	features: pd.DataFrame,
	labels: pd.Series,
) -> Tuple[CalibratedClassifierCV, Dict[str, int], Dict[str, object]]:
	label_map = {label: idx for idx, label in enumerate(sorted(labels.unique()))}
	y = labels.map(label_map).values

	cutoff = int(len(features) * 0.8)
	if cutoff < 10:
		raise RuntimeError("Not enough rows for time-based split. Add more data first.")

	x_train = features.values[:cutoff]
	x_test = features.values[cutoff:]
	y_train = y[:cutoff]
	y_test = y[cutoff:]

	classes = np.unique(y_train)
	class_weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
	weight_map = {cls: weight for cls, weight in zip(classes, class_weights)}
	sample_weight = np.array([weight_map[cls] for cls in y_train])

	base_model = XGBClassifier(
		objective="multi:softprob",
		n_estimators=400,
		max_depth=6,
		learning_rate=0.08,
		subsample=0.9,
		colsample_bytree=0.9,
		eval_metric="mlogloss",
		random_state=42,
	)

	calibration_cv = TimeSeriesSplit(n_splits=4)
	model = CalibratedClassifierCV(base_model, method="isotonic", cv=calibration_cv)
	model.fit(x_train, y_train, sample_weight=sample_weight)

	predictions = model.predict(x_test)
	ordered_labels = [idx for _, idx in sorted(label_map.items(), key=lambda item: item[1])]
	ordered_names = [name for name, _ in sorted(label_map.items(), key=lambda item: item[1])]
	report_text = classification_report(
		y_test,
		predictions,
		labels=ordered_labels,
		target_names=ordered_names,
		zero_division=0,
	)
	report_dict = classification_report(
		y_test,
		predictions,
		labels=ordered_labels,
		target_names=ordered_names,
		zero_division=0,
		output_dict=True,
	)
	print("\nModel evaluation (time-split):\n")
	print(report_text)

	return model, label_map, report_dict


def write_training_report(
	output_dir: Path,
	class_counts: Dict[str, int],
	label_map: Dict[str, int],
	min_class_count: int,
	cutoff: int,
	row_count: int,
	report: Dict[str, object],
) -> None:
	report_payload = {
		"generated_at": datetime.now(timezone.utc).isoformat(),
		"rows": row_count,
		"train_size": cutoff,
		"test_size": max(0, row_count - cutoff),
		"min_class_count": min_class_count,
		"class_counts": class_counts,
		"label_map": label_map,
		"warnings": [
			"Metrics may be inflated if synthetic/seeded data dominates recent samples.",
		],
		"metrics": report,
	}
	(output_dir / "training_report.json").write_text(
		json.dumps(report_payload, indent=2, ensure_ascii=True),
		encoding="utf-8",
	)


def save_artifacts(model: CalibratedClassifierCV, label_map: Dict[str, int], output_dir: Path) -> None:
	output_dir.mkdir(parents=True, exist_ok=True)
	joblib.dump(model, output_dir / "heat_advisory_model.joblib")
	(output_dir / "label_map.json").write_text(json.dumps(label_map, indent=2), encoding="utf-8")


def load_artifacts(model_dir: Path) -> Tuple[CalibratedClassifierCV, Dict[str, int]]:
	model = joblib.load(model_dir / "heat_advisory_model.joblib")
	label_map = json.loads((model_dir / "label_map.json").read_text(encoding="utf-8"))
	return model, {str(k): int(v) for k, v in label_map.items()}


def predict_risk_level(model: RandomForestClassifier, label_map: Dict[str, int], features: Dict[str, float]) -> Tuple[str, float]:
	input_vector = np.array(
		[[
			features["temperature_c"],
			features["humidity_percent"],
			features["wind_speed_mps"],
			features["pressure_hpa"],
			features["heat_index_c"],
		]]
	)
	predicted_idx = int(model.predict(input_vector)[0])
	reverse_map = {idx: label for label, idx in label_map.items()}
	risk_level = reverse_map.get(predicted_idx, "safe")

	confidence = 0.0
	if hasattr(model, "predict_proba"):
		probs = model.predict_proba(input_vector)[0]
		confidence = float(max(probs))

	return risk_level, confidence


def build_advisory(
	risk_level: str,
	weather: Dict[str, object],
	confidence: float,
	language_style: str = "english",
) -> AdvisoryOutput:
	templates = TEMPLATES.get(language_style, TEMPLATES["english"])
	template = templates.get(risk_level, templates["safe"])
	scope_note = (
		"Heat-advisory scope only. Final suspension decisions remain with school and DepEd leadership."
		if language_style == "english"
		else "Heat-advisory scope lang. Final suspension decision ay nasa school at DepEd leadership."
	)

	decision_basis = {
		"heatIndexC": float(weather["heat_index_c"]),
		"temperatureC": float(weather["temperature_c"]),
		"humidityPercent": float(weather["humidity_percent"]),
		"heatLevel": risk_level,
		"dataSource": weather.get("source", "unknown"),
		"rationale": [
			"Model predicts risk level based on recent weather + heat index data.",
			"Use results with school policy guidance for operational decisions.",
		],
	}

	return AdvisoryOutput(
		summary=template["summary"],
		riskLevel=risk_level,
		actions=template["actions"],
		safetyTips=template["safetyTips"],
		scopeNote=scope_note,
		confidenceScore=round(confidence, 2),
		decisionBasis=decision_basis,
		modelProfile={"mode": "rule-grounded-ai", "scope": "system-only"},
	)


def run_training(db_url: str, output_dir: Path, min_class_count: int) -> None:
	rows = fetch_training_rows(db_url)
	features, labels, _timestamps = build_dataset(rows)
	cutoff = int(len(features) * 0.8)
	class_counts = summarize_class_counts(labels)
	print("\nClass distribution:")
	for level in RISK_LEVELS:
		print(f"- {level}: {class_counts[level]}")

	if should_skip_training(class_counts, min_class_count):
		print(
			"\nSkipping training: not enough samples for every risk level."
			f" Minimum per class is {min_class_count}."
		)
		return
	model, label_map, report = train_model(features, labels)
	save_artifacts(model, label_map, output_dir)
	write_training_report(
		output_dir,
		class_counts,
		label_map,
		min_class_count,
		cutoff,
		len(features),
		report,
	)
	print(f"Saved model artifacts to: {output_dir}")


def run_prediction(model_dir: Path, input_json: Path, language_style: str) -> None:
	model, label_map = load_artifacts(model_dir)
	payload = json.loads(input_json.read_text(encoding="utf-8"))
	features = {
		"temperature_c": payload["temperatureC"],
		"humidity_percent": payload["humidityPercent"],
		"wind_speed_mps": payload["windSpeedMps"],
		"pressure_hpa": payload["pressureHpa"],
		"heat_index_c": payload["heatIndexC"],
		"source": payload.get("source", "unknown"),
	}
	risk_level, confidence = predict_risk_level(model, label_map, features)
	advisory = build_advisory(risk_level, features, confidence, language_style)
	print(json.dumps(advisory.__dict__, ensure_ascii=True, indent=2))


def main() -> None:
	parser = argparse.ArgumentParser(description="Heat advisory training/prediction tool")
	parser.add_argument("--env-file", default=".env", help="Path to .env file for DATABASE_URL")

	subparsers = parser.add_subparsers(dest="command", required=True)

	train_parser = subparsers.add_parser("train", help="Train and save a model")
	train_parser.add_argument("--db-url", default=None, help="Postgres connection string")
	train_parser.add_argument("--output-dir", default="model", help="Model output directory")
	train_parser.add_argument(
		"--min-class-count",
		type=int,
		default=0,
		help="Skip training unless each risk level has at least this many rows",
	)

	predict_parser = subparsers.add_parser("predict", help="Predict advisory from JSON input")
	predict_parser.add_argument("--model-dir", default="model", help="Directory with saved model")
	predict_parser.add_argument("--input-json", required=True, help="Input weather JSON file")
	predict_parser.add_argument("--language", default="english", choices=["english", "tagalog"])

	args = parser.parse_args()
	load_env_file(Path(args.env_file))

	if args.command == "train":
		db_url = get_database_url(args.db_url)
		run_training(db_url, Path(args.output_dir), args.min_class_count)
	elif args.command == "predict":
		run_prediction(Path(args.model_dir), Path(args.input_json), args.language)


if __name__ == "__main__":
	main()
