import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_RAW_DIR = BASE_DIR.parent / "data" / "raw"
DATA_PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_STORE_DIR = BASE_DIR / "models_store"

PROCESSED_PARQUET = DATA_PROCESSED_DIR / "events_clean.parquet"
LOCATION_PRIORS_FILE = MODELS_STORE_DIR / "location_priors.json"
DURATION_MODEL_FILE = MODELS_STORE_DIR / "duration_model.joblib"
CLOSURE_MODEL_FILE = MODELS_STORE_DIR / "closure_model.joblib"
DURATION_METRICS_FILE = MODELS_STORE_DIR / "duration_model_metrics.json"
CLOSURE_METRICS_FILE = MODELS_STORE_DIR / "closure_model_metrics.json"

SQLITE_FILE = BASE_DIR / "prahari.db"

# EIS component weights — named constants so Learn phase can adjust
EIS_WEIGHT_DURATION = 0.30
EIS_WEIGHT_CLOSURE = 0.25
EIS_WEIGHT_LOCATION = 0.25
EIS_WEIGHT_CONCURRENCY = 0.15
EIS_WEIGHT_CAUSE_SEVERITY = 0.05

EIS_DURATION_CAP_HOURS = 168  # 1 week

# Officer pool defaults per EIS band
OFFICER_BAND = {
    (80, 100): (6, 8),
    (50, 79): (3, 5),
    (20, 49): (1, 2),
    (0, 19): (0, 1),
}
DEFAULT_OFFICER_POOL = 20

# Spatial grid resolution (~500m)
GRID_RESOLUTION = 200  # 1/200 degree ≈ 500m

# Empirical Bayes shrinkage k
EB_SHRINKAGE_K = 10

# Temporal train/test split date
TRAIN_TEST_SPLIT_DATE = "2024-03-01"

# Diversion search radius (degrees, ~300m)
DIVERSION_RADIUS_DEG = 0.003

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
