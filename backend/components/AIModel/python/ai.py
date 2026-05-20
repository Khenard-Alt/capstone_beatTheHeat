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
import warnings
from psycopg2.extras import RealDictCursor
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report
from sklearn.model_selection import StratifiedKFold, TimeSeriesSplit, train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.model_selection import RandomizedSearchCV
from scipy.stats import randint, uniform
try:
	from imblearn.pipeline import Pipeline as ImbPipeline  # type: ignore[import-not-found]
except Exception:
	ImbPipeline = None
try:
	from imblearn.over_sampling import SMOTE  # type: ignore[import-not-found]
except Exception:
	SMOTE = None
from xgboost import XGBClassifier

# Prevent loky from spawning external system commands to detect CPU
# (avoids CreateProcess/wmic/powershell calls on Windows).
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(max(1, os.cpu_count() or 1)))

# Silence repeated XGBoost warning about unused 'use_label_encoder' parameter
warnings.filterwarnings("ignore", message=".*use_label_encoder.*")


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


def load_rows_from_csv(csv_path: Path) -> List[Dict[str, object]]:
	import csv

	rows = []
	with csv_path.open(encoding="utf-8") as fh:
		reader = csv.DictReader(fh)
		for r in reader:
			try:
				rows.append({
					"temperature_c": float(r.get("temperature_c") or r.get("temperatureC") or 0),
					"humidity_percent": float(r.get("humidity_percent") or r.get("humidityPercent") or 0),
					"wind_speed_mps": float(r.get("wind_speed_mps") or r.get("windSpeedMps") or 0),
					"pressure_hpa": float(r.get("pressure_hpa") or r.get("pressureHpa") or 0),
					"heat_index_c": float(r.get("heat_index_c") or r.get("heatIndexC") or 0),
					"heat_level": r.get("heat_level") or r.get("heatLevel") or r.get("riskLevel") or None,
					"observed_at": r.get("observed_at") or r.get("timestamp") or r.get("createdAt") or None,
				})
			except Exception:
				continue
	return rows


def build_dataset(rows: List[Dict[str, object]]) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
	if not rows:
		raise RuntimeError("No training data found in weather_data + heat_index_logs.")
	df = pd.DataFrame(rows)
	df = df[df["heat_level"].isin(RISK_LEVELS)]
	if df.empty:
		raise RuntimeError("No rows with supported heat_level values.")

	df["observed_at"] = pd.to_datetime(df["observed_at"], errors="coerce", utc=True)
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


def _merge_best_params(best_params: Dict[str, object] | None, defaults: Dict[str, object]) -> Dict[str, object]:
	"""Merge `best_params` returned by RandomizedSearchCV into a defaults dict.

	Convert keys like 'clf__n_estimators' -> 'n_estimators'.
	"""
	params = dict(defaults)
	if not best_params:
		return params
	for k, v in best_params.items():
		key = k.replace("clf__", "") if isinstance(k, str) else k
		params[key] = v
	return params


def train_model(
	features: pd.DataFrame,
	labels: pd.Series,
	best_params: Dict[str, object] | None = None,
	) -> Tuple[CalibratedClassifierCV, Dict[str, int], Dict[str, object] | None]:
	label_map = {label: idx for idx, label in enumerate(sorted(labels.unique()))}
	y = labels.map(label_map).values
	print(f"ENTER train_model: rows={len(features) if features is not None else 'None'}, best_params={best_params}")

	# Keep a copy of full features/labels to allow a stratified test split
	features_full = features.reset_index(drop=True).copy()
	labels_full = labels.reset_index(drop=True).copy()

	# Reserve an out-of-time holdout (last 10% chronologically) that will not be resampled
	feature_cols = ["temperature_c", "humidity_percent", "wind_speed_mps", "pressure_hpa", "heat_index_c"]
	holdout_n = max(1, int(len(features) * 0.1))
	holdout_X = features.iloc[-holdout_n:][feature_cols].values
	holdout_y = labels.map(label_map).values[-holdout_n:]

	# Create a stratified test split (from the pre-holdout portion) for balanced evaluation
	stratified_test_X = None
	stratified_test_y = None
	try:
		candidate_features = features_full.iloc[:-holdout_n].reset_index(drop=True)
		candidate_labels = labels_full.iloc[:-holdout_n].reset_index(drop=True)
		# Only attempt stratified split if every class exists in the candidate set
		if candidate_labels.nunique() >= len(label_map):
			from sklearn.model_selection import train_test_split as _tts
			_, stratified_test_X, _, stratified_test_y = _tts(
				candidate_features[feature_cols].values,
				candidate_labels.map(label_map).values,
				test_size=0.2,
				stratify=candidate_labels.map(label_map).values,
				random_state=42,
			)
			print(f"Built stratified test: n={len(stratified_test_y)}")
		else:
			print("Stratified test not possible: candidate set missing classes")
	except Exception:
		stratified_test_X = None
		stratified_test_y = None

	# Shrink features/labels to exclude holdout for all further CV and training steps
	features = features.iloc[:-holdout_n].reset_index(drop=True)
	labels = labels.iloc[:-holdout_n].reset_index(drop=True)
	y = labels.map(label_map).values

	feature_cols = ["temperature_c", "humidity_percent", "wind_speed_mps", "pressure_hpa", "heat_index_c"]

	# Stratified cross-validation keeps every class represented in each fold.
	tscv = StratifiedKFold(n_splits=4, shuffle=True, random_state=42)
	cv_true = []
	cv_pred = []
	for fold, (train_idx, test_idx) in enumerate(tscv.split(features, y)):
		X_fold_train = features.iloc[train_idx][feature_cols].values
		y_fold_train = y[train_idx]
		X_fold_test = features.iloc[test_idx][feature_cols].values
		y_fold_test = y[test_idx]

		# Apply SMOTE or fallback resampling on fold training
		X_res, y_res = None, None
		if SMOTE is not None:
			try:
				sm = SMOTE(random_state=42)
				X_res, y_res = sm.fit_resample(X_fold_train, y_fold_train)
			except Exception:
				X_res, y_res = None, None

		if X_res is None:
			# fallback simple resample to median target
			df_fold = pd.DataFrame(X_fold_train, columns=feature_cols)
			df_fold['label_int'] = y_fold_train
			counts = df_fold['label_int'].value_counts()
			target = max(20, int(counts[counts > 0].median()))
			parts = []
			for lbl, cnt in counts.items():
				subset = df_fold[df_fold['label_int'] == lbl]
				if cnt < target:
					parts.append(subset.sample(n=target, replace=True, random_state=42))
				elif cnt > target:
					parts.append(subset.sample(n=target, replace=False, random_state=42))
				else:
					parts.append(subset)
			merged = pd.concat(parts, ignore_index=True).sample(frac=1.0, random_state=42)
			X_res = merged[feature_cols].values
			y_res = merged['label_int'].values
	# small random validation split for early stopping
		try:
			X_tr, X_val, y_tr, y_val = train_test_split(X_res, y_res, test_size=0.1, random_state=42, shuffle=True)
		except Exception:
			X_tr, y_tr = X_res, y_res
			X_val, y_val = X_res, y_res

		# train with early stopping
		cv_defaults = dict(
			objective="multi:softprob",
			n_estimators=300,
			max_depth=6,
			learning_rate=0.08,
			subsample=0.9,
			colsample_bytree=0.9,
			eval_metric="mlogloss",
			use_label_encoder=False,
			random_state=42,
		)
		cv_kwargs = _merge_best_params(best_params, cv_defaults)
		cv_model = XGBClassifier(**cv_kwargs)
		try:
			cv_model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], early_stopping_rounds=30, verbose=False)
		except Exception:
			cv_model.fit(X_tr, y_tr)

		preds = cv_model.predict(X_fold_test)
		cv_true.append(y_fold_test)
		cv_pred.append(preds)

	if cv_true:
		y_true_all = np.concatenate(cv_true)
		y_pred_all = np.concatenate(cv_pred)
		cv_report_dict = classification_report(y_true_all, y_pred_all, labels=list(label_map.values()), target_names=list(label_map.keys()), output_dict=True, zero_division=0)
	else:
		cv_report_dict = {}


### moved tune_model down so train_model contains the full training flow

	cutoff = int(len(features) * 0.8)
	if cutoff < 10:
		raise RuntimeError("Not enough rows for time-based split. Add more data first.")

	# Create time-split training and test sets (train = earlier rows)
	train_df = features.reset_index(drop=True).iloc[:cutoff].copy()
	train_df['label'] = labels.values[:cutoff]
	test_df = features.reset_index(drop=True).iloc[cutoff:].copy()
	test_df['label'] = labels.values[cutoff:]

	# If the time-split test set does not contain examples for every class,
	# fall back to a stratified train/test split across the whole dataset
	# to ensure evaluation metrics are meaningful.
	num_classes = len(label_map)
	if test_df['label'].nunique() < num_classes:
		full_df = features.reset_index(drop=True).copy()
		full_df['label'] = labels.values
		train_df, test_df = train_test_split(full_df, test_size=0.2, stratify=full_df['label'], random_state=42)

	# Rebalance training set: prefer SMOTE synthetic oversampling for minorities.
	feature_cols = ["temperature_c", "humidity_percent", "wind_speed_mps", "pressure_hpa", "heat_index_c"]
	# Map labels to integer indices for SMOTE and training
	train_df['label_int'] = train_df['label'].map(label_map)
	test_df['label_int'] = test_df['label'].map(label_map)

	X_train_raw = train_df[feature_cols].values
	y_train_raw = train_df['label_int'].values
	x_test = test_df[feature_cols].values
	y_test = test_df['label_int'].values

	balanced_X = None
	balanced_y = None
	if SMOTE is not None:
		try:
			sm = SMOTE(random_state=42)
			balanced_X, balanced_y = sm.fit_resample(X_train_raw, y_train_raw)
		except Exception as e:
			# Fall back to simple resampling if SMOTE fails (e.g., too few samples per class)
			balanced_X = None
			balanced_y = None

	if balanced_X is None:
		# Fallback: perform simple up/down sampling to median target
		class_counts = train_df['label'].value_counts()
		nonzero_counts = class_counts[class_counts > 0]
		if len(nonzero_counts) == 0:
			raise RuntimeError("No labeled rows in training set after filtering")
		target = max(20, int(nonzero_counts.median()))
		resampled_frames = []
		for lbl, cnt in class_counts.items():
			subset = train_df[train_df['label'] == lbl]
			if cnt == 0:
				continue
			if cnt < target:
				upsampled = subset.sample(n=target, replace=True, random_state=42)
				resampled_frames.append(upsampled)
			elif cnt > target:
				downsampled = subset.sample(n=target, replace=False, random_state=42)
				resampled_frames.append(downsampled)
			else:
				resampled_frames.append(subset)
		balanced_train = pd.concat(resampled_frames, ignore_index=True).sample(frac=1.0, random_state=42)
		balanced_X = balanced_train[feature_cols].values
		balanced_y = balanced_train['label'].map(label_map).values

	x_train = balanced_X
	y_train = balanced_y

	classes = np.unique(y_train)
	class_weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
	weight_map = {cls: weight for cls, weight in zip(classes, class_weights)}
	sample_weight = np.array([weight_map[cls] for cls in y_train])

	base_defaults = dict(
		objective="multi:softprob",
		n_estimators=400,
		max_depth=6,
		learning_rate=0.08,
		subsample=0.9,
		colsample_bytree=0.9,
		eval_metric="mlogloss",
		random_state=42,
	)
	base_model = XGBClassifier(**_merge_best_params(best_params, base_defaults))

	# Final training: train base XGBoost with early stopping using a small holdout from the balanced training set
	# Split balanced training into train + calib (for calibration)
	try:
		stratify_labels = y_train if len(np.unique(y_train)) > 1 else None
		X_main, X_calib, y_main, y_calib = train_test_split(
			x_train,
			y_train,
			test_size=0.1,
			random_state=42,
			shuffle=True,
			stratify=stratify_labels,
		)
	except Exception:
		X_main, y_main = x_train, y_train
		X_calib, y_calib = x_train, y_train

	final_defaults = dict(
		objective="multi:softprob",
		n_estimators=300,
		max_depth=6,
		learning_rate=0.08,
		subsample=0.9,
		colsample_bytree=0.9,
		eval_metric="mlogloss",
		use_label_encoder=False,
		random_state=42,
	)
	final_xgb = XGBClassifier(**_merge_best_params(best_params, final_defaults))
	try:
		final_xgb.fit(X_main, y_main, eval_set=[(X_calib, y_calib)], early_stopping_rounds=30, verbose=False)
	except Exception:
		final_xgb.fit(X_main, y_main)

	# Calibrate the classifier. Some sklearn versions do not accept 'prefit',
	# so use a small CV (3 folds) to let CalibratedClassifierCV refit the base
	# estimator during calibration. This is slightly heavier but compatible.
	model = CalibratedClassifierCV(final_xgb, method="isotonic", cv=3)
	model.fit(X_main, y_main)

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


	# Evaluate on holdout (never resampled)
	try:
		holdout_preds = model.predict(holdout_X)
		holdout_report_dict = classification_report(
			holdout_y,
			holdout_preds,
			labels=list(label_map.values()),
			target_names=list(label_map.keys()),
			output_dict=True,
			zero_division=0,
		)
	except Exception:
		holdout_report_dict = {}

	# Evaluate on stratified test (if available)
	stratified_report_dict = {}
	if stratified_test_X is not None and stratified_test_y is not None and len(stratified_test_y) > 0:
		try:
			strat_preds = model.predict(stratified_test_X)
			stratified_report_dict = classification_report(
				stratified_test_y,
				strat_preds,
				labels=list(label_map.values()),
				target_names=list(label_map.keys()),
				output_dict=True,
				zero_division=0,
			)
		except Exception:
			stratified_report_dict = {}
		print("Stratified test evaluation computed.")
	else:
		print("No stratified test available for evaluation.")

	# Attach CV, final, and holdout metrics
	# Compose final metrics payload. Include stratified test metrics when available.
	report_payload_metrics = {}
	if 'cv_report_dict' in locals() and cv_report_dict:
		report_payload_metrics['cv_metrics'] = cv_report_dict
	report_payload_metrics['final_metrics'] = report_dict
	report_payload_metrics['holdout_metrics'] = holdout_report_dict
	if stratified_report_dict:
		report_payload_metrics['stratified_test_metrics'] = stratified_report_dict

	report_dict = report_payload_metrics

	# Promotion gate: block if holdout lacks class coverage or if metrics look suspiciously perfect with tiny support
	promotion_blocked = False
	promotion_reasons = []
	try:
		holdout_support = {name: int(holdout_report_dict.get(name, {}).get('support', 0)) for name in label_map.keys()}
		# require at least one example per class in holdout to consider automatic promotion
		for name, idx in label_map.items():
			if holdout_support.get(name, 0) <= 0:
				promotion_blocked = True
				promotion_reasons.append(f"Holdout missing class: {name}")

		# block if any class has perfect f1 with very small support
		for name in label_map.keys():
			stats = holdout_report_dict.get(name, {})
			f1 = float(stats.get('f1-score', 0) or 0)
			supp = int(stats.get('support', 0) or 0)
			if f1 == 1.0 and supp < 20:
				promotion_blocked = True
				promotion_reasons.append(f"Perfect f1 for {name} with low support ({supp})")
	except Exception:
		pass

	# Annotate report dict with promotion gate
	report_dict['promotion_blocked'] = promotion_blocked
	report_dict['promotion_reasons'] = promotion_reasons

	print("\nModel evaluation (time-split / final):\n")
	print(report_text)
	print("EXIT train_model: returning model, label_map, report_dict")

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


def write_model_registry(
	output_dir: Path,
	class_counts: Dict[str, int],
	label_map: Dict[str, int],
	min_class_count: int,
	report: Dict[str, object],
) -> None:
	promotion_blocked = bool(report.get("promotion_blocked", False))
	metrics = report.get("final_metrics", {}) if isinstance(report, dict) else {}
	holdout_metrics = report.get("holdout_metrics", {}) if isinstance(report, dict) else {}
	stratified_metrics = report.get("stratified_test_metrics", {}) if isinstance(report, dict) else {}
	registry_payload = {
		"generated_at": datetime.now(timezone.utc).isoformat(),
		"status": "needs-review" if promotion_blocked else "promoted",
		"promotion": {
			"blocked": promotion_blocked,
			"reasons": report.get("promotion_reasons", []) if isinstance(report, dict) else [],
		},
		"data": {
			"rows": int(report.get("rows", 0)) if isinstance(report, dict) and report.get("rows") is not None else None,
			"min_class_count": min_class_count,
			"class_counts": class_counts,
			"label_map": label_map,
		},
		"metrics": {
			"final_accuracy": metrics.get("accuracy"),
			"holdout_accuracy": holdout_metrics.get("accuracy"),
			"stratified_accuracy": stratified_metrics.get("accuracy"),
		},
		"artifacts": {
			"model": "heat_advisory_model.joblib",
			"labels": "label_map.json",
			"training_report": "training_report.json",
		},
	}
	(output_dir / "model_registry.json").write_text(
		json.dumps(registry_payload, indent=2, ensure_ascii=True),
		encoding="utf-8",
	)


def tune_model(features: pd.DataFrame, labels: pd.Series, output_dir: Path) -> Dict[str, object]:
	"""Run a randomized hyperparameter search on an imblearn pipeline (SMOTE + XGB).

	Saves `tuning_report.json` under `output_dir` with best params and CV results.
	Returns best_params dict.
	"""
	feature_cols = ["temperature_c", "humidity_percent", "wind_speed_mps", "pressure_hpa", "heat_index_c"]
	X = features[feature_cols].values
	label_map = {label: idx for idx, label in enumerate(sorted(labels.unique()))}
	y = labels.map(label_map).values

	# Build pipeline
	if ImbPipeline is not None and SMOTE is not None:
		steps = [("smote", SMOTE(random_state=42)), ("clf", XGBClassifier(objective="multi:softprob", use_label_encoder=False, eval_metric="mlogloss", random_state=42))]
		pipeline = ImbPipeline(steps=steps)
	else:
		pipeline = XGBClassifier(objective="multi:softprob", use_label_encoder=False, eval_metric="mlogloss", random_state=42)

	param_dist = {
		"clf__n_estimators": randint(100, 400) if ImbPipeline is not None else randint(100, 400),
		"clf__max_depth": randint(3, 8) if ImbPipeline is not None else randint(3, 8),
		"clf__learning_rate": uniform(0.01, 0.2) if ImbPipeline is not None else uniform(0.01, 0.2),
		"clf__subsample": uniform(0.6, 0.4) if ImbPipeline is not None else uniform(0.6, 0.4),
		"clf__colsample_bytree": uniform(0.6, 0.4) if ImbPipeline is not None else uniform(0.6, 0.4),
	}

	tscv = TimeSeriesSplit(n_splits=3)
	search = RandomizedSearchCV(pipeline, param_distributions=param_dist, n_iter=20, cv=tscv, scoring="f1_weighted", random_state=42, n_jobs=1, verbose=1)
	search.fit(X, y)

	best = search.best_params_
	results = search.cv_results_

	# Save tuning report
	output_dir = Path(output_dir)
	output_dir.mkdir(parents=True, exist_ok=True)
	(output_dir / "tuning_report.json").write_text(json.dumps({"best_params": best, "cv_results": {k: v.tolist() if hasattr(v, 'tolist') else v for k, v in results.items()}}, default=str), encoding="utf-8")
	return best


def save_artifacts(model: CalibratedClassifierCV, label_map: Dict[str, int], output_dir: Path) -> None:
	output_dir.mkdir(parents=True, exist_ok=True)
	joblib.dump(model, output_dir / "heat_advisory_model.joblib")
	(output_dir / "label_map.json").write_text(json.dumps(label_map, indent=2), encoding="utf-8")


def load_artifacts(model_dir: Path) -> Tuple[CalibratedClassifierCV, Dict[str, int]]:
	model = joblib.load(model_dir / "heat_advisory_model.joblib")
	label_map = json.loads((model_dir / "label_map.json").read_text(encoding="utf-8"))
	return model, {str(k): int(v) for k, v in label_map.items()}


def predict_risk_level(model: object, label_map: Dict[str, int], features: Dict[str, float]) -> Tuple[str, float]:
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


def _risk_index(level: str) -> int:
	order = ["safe", "caution", "extreme-caution", "danger", "extreme-danger"]
	try:
		return order.index(level)
	except ValueError:
		return 0


def _rule_based_risk_level(features: Dict[str, float]) -> str:
	"""Map heat index directly to a conservative, deterministic risk level.

	This keeps the final advisory aligned with the scenario thresholds used by the
	UI smoke tests while the ML model remains available for confidence/rationale.
	"""
	hi = float(features.get("heat_index_c", 0.0) or 0.0)
	if hi >= 50.0:
		return "extreme-danger"
	if hi >= 40.0:
		return "danger"
	if hi >= 37.0:
		return "extreme-caution"
	if hi >= 31.0:
		return "caution"
	return "safe"


def apply_safety_rules(risk_level: str, features: Dict[str, float]) -> Tuple[str, bool, str]:
	"""Promote risk_level if heat-index thresholds indicate higher risk.

	Returns: (new_risk_level, overridden_flag, reason)
	"""
	hi = float(features.get("heat_index_c", 0.0) or 0.0)
	# Thresholds (C) for escalation — conservative safety-first defaults
	if hi >= 50.0:
		threshold = "extreme-danger"
	elif hi >= 40.0:
		threshold = "danger"
	elif hi >= 37.0:
		threshold = "extreme-caution"
	elif hi >= 31.0:
		threshold = "caution"
	else:
		threshold = "safe"

	old_idx = _risk_index(risk_level)
	th_idx = _risk_index(threshold)
	if th_idx > old_idx:
		reason = f"Rule override: heat_index_c={hi} >= threshold for {threshold}"
		return threshold, True, reason
	return risk_level, False, ""


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


def run_training(db_url: str, output_dir: Path, min_class_count: int, best_params: Dict[str, object] | None = None) -> None:
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
	result = train_model(features, labels, best_params=best_params)
	if result is None:
		raise RuntimeError("train_model returned None — internal training failure. Check trainer logs for earlier exceptions.")
	model, label_map, report = result
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
	write_model_registry(output_dir, class_counts, label_map, min_class_count, report)
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
	model_risk_level, confidence = predict_risk_level(model, label_map, features)
	risk_level = _rule_based_risk_level(features)

	# Preserve the model prediction in the rationale, but keep the final risk level
	# aligned with heat-index thresholds for stable, predictable advisories.

	advisory = build_advisory(risk_level, features, confidence, language_style)
	advisory.decisionBasis.setdefault("rationale", [])
	advisory.decisionBasis["rationale"].insert(0, f"Model prediction was {model_risk_level}; final risk level follows heat-index thresholds.")
	advisory.modelProfile["ruleOverride"] = True
	advisory.modelProfile["modelPrediction"] = model_risk_level
	print(json.dumps(advisory.__dict__, ensure_ascii=True, indent=2))


def main() -> None:
	parser = argparse.ArgumentParser(description="Heat advisory training/prediction tool")
	parser.add_argument("--env-file", default=".env", help="Path to .env file for DATABASE_URL")

	subparsers = parser.add_subparsers(dest="command", required=True)

	train_parser = subparsers.add_parser("train", help="Train and save a model")
	train_parser.add_argument("--db-url", default=None, help="Postgres connection string")
	train_parser.add_argument("--train-csv", default=None, help="Path to CSV file exported from audit logs to use as training data")
	train_parser.add_argument("--output-dir", default="model", help="Model output directory")
	train_parser.add_argument(
		"--min-class-count",
		type=int,
		default=0,
		help="Skip training unless each risk level has at least this many rows",
	)
	train_parser.add_argument("--tune", action="store_true", help="Run hyperparameter tuning instead of normal training")
	train_parser.add_argument("--apply-best", action="store_true", help="Load tuning_report.json from --output-dir and apply best params when training")

	predict_parser = subparsers.add_parser("predict", help="Predict advisory from JSON input")
	predict_parser.add_argument("--model-dir", default="model", help="Directory with saved model")
	predict_parser.add_argument("--input-json", required=True, help="Input weather JSON file")
	predict_parser.add_argument("--language", default="english", choices=["english", "tagalog"])

	args = parser.parse_args()
	load_env_file(Path(args.env_file))

	if args.command == "train":
		# If a CSV training file is provided, load rows from CSV instead of DB
		if getattr(args, 'train_csv', None):
			csv_path = Path(args.train_csv)
			rows = load_rows_from_csv(csv_path)
			features, labels, _timestamps = build_dataset(rows)
			cutoff = int(len(features) * 0.8)
			class_counts = summarize_class_counts(labels)
			if should_skip_training(class_counts, args.min_class_count):
				print("\nSkipping training: not enough samples for every risk level.")
				return
			if args.tune:
				from pathlib import Path as P
				best = tune_model(features, labels, Path(args.output_dir))
				print("Tuning complete. Best params:", best)
				return
			# If requested, load best params from previous tuning report
			best = None
			if getattr(args, "apply_best", False) or getattr(args, "apply-best", False) or args.apply_best:
				report_path = Path(args.output_dir) / "tuning_report.json"
				if report_path.exists():
					try:
						best = json.loads(report_path.read_text(encoding="utf-8")).get("best_params")
						print("Loaded best params from:", report_path)
					except Exception:
						best = None
			result = train_model(features, labels, best_params=best)
			if result is None:
				raise RuntimeError("train_model returned None — internal training failure. Check trainer logs for earlier exceptions.")
			model, label_map, report = result
			save_artifacts(model, label_map, Path(args.output_dir))
			write_training_report(
				Path(args.output_dir),
				class_counts,
				label_map,
				args.min_class_count,
				cutoff,
				len(features),
				report,
			)
			write_model_registry(Path(args.output_dir), class_counts, label_map, args.min_class_count, report)
			print(f"Saved model artifacts to: {args.output_dir}")
		else:
			db_url = get_database_url(args.db_url)
			if args.tune:
				rows = fetch_training_rows(db_url)
				features, labels, _ = build_dataset(rows)
				best = tune_model(features, labels, Path(args.output_dir))
				print("Tuning complete. Best params:", best)
				return
			else:
				best = None
				if args.apply_best:
					report_path = Path(args.output_dir) / "tuning_report.json"
					if report_path.exists():
						try:
							best = json.loads(report_path.read_text(encoding="utf-8")).get("best_params")
							print("Loaded best params from:", report_path)
						except Exception:
							best = None
				run_training(db_url, Path(args.output_dir), args.min_class_count, best_params=best)
	elif args.command == "predict":
		run_prediction(Path(args.model_dir), Path(args.input_json), args.language)


if __name__ == "__main__":
	main()
