import sys
from pathlib import Path
import unittest

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
PYTHON_DIR = ROOT / "python"
if str(PYTHON_DIR) not in sys.path:
	sys.path.insert(0, str(PYTHON_DIR))

import ai  # noqa: E402


class TrainerHelpersTest(unittest.TestCase):
	def test_merge_best_params_overrides_classifier_keys(self):
		defaults = {"n_estimators": 100, "max_depth": 6, "learning_rate": 0.1}
		best_params = {"clf__n_estimators": 250, "clf__max_depth": 4}
		merged = ai._merge_best_params(best_params, defaults)
		self.assertEqual(merged["n_estimators"], 250)
		self.assertEqual(merged["max_depth"], 4)
		self.assertEqual(merged["learning_rate"], 0.1)

	def test_rule_based_risk_level_uses_heat_thresholds(self):
		self.assertEqual(ai._rule_based_risk_level({"heat_index_c": 28.0}), "safe")
		self.assertEqual(ai._rule_based_risk_level({"heat_index_c": 31.0}), "caution")
		self.assertEqual(ai._rule_based_risk_level({"heat_index_c": 37.0}), "extreme-caution")
		self.assertEqual(ai._rule_based_risk_level({"heat_index_c": 40.0}), "danger")
		self.assertEqual(ai._rule_based_risk_level({"heat_index_c": 50.0}), "extreme-danger")

	def test_apply_safety_rules_promotes_lower_predictions(self):
		risk_level, overridden, reason = ai.apply_safety_rules("safe", {"heat_index_c": 41.0})
		self.assertEqual(risk_level, "danger")
		self.assertTrue(overridden)
		self.assertIn("threshold", reason)

	def test_build_dataset_sorts_by_observed_time(self):
		rows = [
			{
				"temperature_c": 32.0,
				"humidity_percent": 60.0,
				"wind_speed_mps": 1.0,
				"pressure_hpa": 1008.0,
				"heat_index_c": 38.0,
				"heat_level": "extreme-caution",
				"observed_at": "2026-05-19T10:00:00Z",
			},
			{
				"temperature_c": 30.0,
				"humidity_percent": 55.0,
				"wind_speed_mps": 1.5,
				"pressure_hpa": 1009.0,
				"heat_index_c": 31.0,
				"heat_level": "caution",
				"observed_at": "2026-05-19T09:00:00Z",
			},
		]
		features, labels, timestamps = ai.build_dataset(rows)
		self.assertEqual(list(labels), ["caution", "extreme-caution"])
		self.assertEqual(features.shape[0], 2)
		self.assertTrue(pd.Series(timestamps).is_monotonic_increasing)


if __name__ == "__main__":
	unittest.main()