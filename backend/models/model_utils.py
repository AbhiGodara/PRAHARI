import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from config import TRAIN_TEST_SPLIT_DATE

CATEGORICAL_FEATURES = ["event_cause", "corridor", "veh_type", "priority"]
# Duration model uses road closure as a known feature (it's not the target there)
NUMERIC_FEATURES_DURATION = ["hour", "dow", "is_weekend", "requires_road_closure"]
# Closure model must NOT use requires_road_closure — it IS the target (avoid leakage)
NUMERIC_FEATURES_CLOSURE = ["hour", "dow", "is_weekend"]

ALL_FEATURES_DURATION = CATEGORICAL_FEATURES + NUMERIC_FEATURES_DURATION
ALL_FEATURES_CLOSURE = CATEGORICAL_FEATURES + NUMERIC_FEATURES_CLOSURE


def make_preprocessor():
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ],
        remainder="passthrough",
    )


def temporal_split(df: pd.DataFrame, date_col: str = "start_datetime"):
    """Temporal train/test split at TRAIN_TEST_SPLIT_DATE (not random)."""
    split = pd.Timestamp(TRAIN_TEST_SPLIT_DATE, tz=None)
    col = pd.to_datetime(df[date_col], errors="coerce")
    if col.dt.tz is not None:
        col = col.dt.tz_localize(None)
    train = df[col < split].copy()
    test = df[col >= split].copy()
    return train, test


def prepare_X(df: pd.DataFrame, for_closure: bool = False) -> pd.DataFrame:
    features = ALL_FEATURES_CLOSURE if for_closure else ALL_FEATURES_DURATION
    X = df[[c for c in features if c in df.columns]].copy()
    if "requires_road_closure" in X.columns:
        X["requires_road_closure"] = X["requires_road_closure"].astype(int)
    for col in CATEGORICAL_FEATURES:
        if col in X.columns:
            X[col] = X[col].fillna("unknown").astype(str)
    return X
