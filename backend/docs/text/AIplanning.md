AI Stack for Beat The Heat (Current Scope)
==========================================

Goal
----
Heat advisory prediction using tabular weather + heat index data.
Output must match the backend `AdvisoryResult` schema (risk level + advisory text).

Primary stack (use now)
-----------------------
- Scikit-learn (classification for tabular data)
- Pandas + NumPy (data prep + feature handling)
- joblib (model save/load)
- psycopg2-binary (fetch training data from Postgres/Supabase)

Optional upgrades (only if needed)
----------------------------------
- XGBoost or LightGBM (stronger tabular models)
- Matplotlib / Seaborn (EDA + reporting)

Not needed for this project scope
---------------------------------
- PyTorch / TensorFlow / Transformers (LLMs, deep learning)
- Computer Vision toolkits (OpenCV, YOLO, Detectron2)
- Reinforcement Learning toolkits (Stable-Baselines3, RLlib)

Training data sources
---------------------
- `public.weather_data`
- `public.heat_index_logs`

Output labels
-------------
- `safe`, `caution`, `extreme-caution`, `danger`, `extreme-danger`

Next steps
----------
1) Install Python deps from `backend/components/AIModel/python/requirements.txt`
2) Train model using `backend/components/AIModel/python/ai.py train`
3) Validate predictions using `ai.py predict`