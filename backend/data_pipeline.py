import glob
import json
import pandas as pd
import numpy as np
from pathlib import Path
from config import (
    DATA_RAW_DIR, DATA_PROCESSED_DIR, PROCESSED_PARQUET, GRID_RESOLUTION
)

ALWAYS_NULL_COLS = ["map_file", "meta_data", "comment"]
TIMESTAMP_COLS = ["start_datetime", "created_date", "modified_datetime",
                   "closed_datetime", "resolved_datetime"]
TZ = "Asia/Kolkata"

CAUSE_REMAP = {
    "Debris": "debris",
    "Fog / Low Visibility": "fog_low_visibility",
    "fog / low visibility": "fog_low_visibility",
}
DROP_CAUSES = {"test_demo"}


def find_csv() -> Path:
    candidates = (
        list(DATA_RAW_DIR.glob("*.csv")) +
        list((DATA_RAW_DIR.parent.parent).glob("*.csv"))
    )
    if not candidates:
        raise FileNotFoundError(f"No CSV found in {DATA_RAW_DIR} or project root")
    return candidates[0]


def load_and_clean() -> pd.DataFrame:
    csv_path = find_csv()
    print(f"Loading CSV: {csv_path}")
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"Raw shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")

    # Drop always-null columns
    df.drop(columns=[c for c in ALWAYS_NULL_COLS if c in df.columns], inplace=True)

    # Parse and convert timestamps to IST
    for col in TIMESTAMP_COLS:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=True, errors="coerce")
            df[col] = df[col].dt.tz_convert(TZ)

    # Derive time features from start_datetime (IST)
    df["hour"] = df["start_datetime"].dt.hour
    df["dow"] = df["start_datetime"].dt.dayofweek   # 0=Mon
    df["is_weekend"] = df["dow"].isin([5, 6]).astype(int)
    df["month"] = df["start_datetime"].dt.month

    # Clean event_cause
    df["event_cause"] = df["event_cause"].str.strip()
    df["event_cause"] = df["event_cause"].replace(CAUSE_REMAP)
    df["event_cause"] = df["event_cause"].str.lower().str.strip()
    df = df[~df["event_cause"].isin(DROP_CAUSES)].copy()

    # Drop null priority rows (only 2)
    df = df[df["priority"].notna()].copy()

    # Build duration_hours (only where closed_datetime is present)
    df["duration_hours"] = np.nan
    mask = df["closed_datetime"].notna() & df["start_datetime"].notna()
    df.loc[mask, "duration_hours"] = (
        (df.loc[mask, "closed_datetime"] - df.loc[mask, "start_datetime"])
        .dt.total_seconds() / 3600
    )
    # Filter to sane range for training subset (right-censoring note below)
    # Rows without closed_datetime are NOT dropped — they remain in the full dataset
    # as active/pending events. Only excluded from the duration regression training set.
    df["duration_trainable"] = (
        df["duration_hours"].notna() &
        (df["duration_hours"] >= 0) &
        (df["duration_hours"] <= 720)
    )

    # Spatial grid cell (~500m)
    df["gy"] = (df["latitude"] * GRID_RESOLUTION).round() / GRID_RESOLUTION
    df["gx"] = (df["longitude"] * GRID_RESOLUTION).round() / GRID_RESOLUTION

    # Active flag
    df["is_currently_active"] = (df["status"] == "active")

    # Fill veh_type nulls
    df["veh_type"] = df["veh_type"].fillna("unknown")
    df["corridor"] = df["corridor"].fillna("Non-corridor")
    df["junction"] = df["junction"].fillna("")

    # Ensure requires_road_closure is bool
    df["requires_road_closure"] = df["requires_road_closure"].astype(str).str.lower().isin(["true", "1", "yes"])

    print(f"Clean shape: {df.shape}")
    print(f"Duration-trainable rows: {df['duration_trainable'].sum()}")

    # IST hour distribution sanity check for vehicle_breakdown
    vb = df[df["event_cause"] == "vehicle_breakdown"]
    night_pct = vb[vb["hour"].between(0, 2)].shape[0] / max(len(vb), 1) * 100
    print(f"vehicle_breakdown night peak (0-2 AM IST): {night_pct:.1f}% of breakdown events")

    return df


def save_processed(df: pd.DataFrame):
    DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    # Convert tz-aware datetimes to UTC strings before parquet save
    for col in TIMESTAMP_COLS:
        if col in df.columns and hasattr(df[col], "dt"):
            df[col] = df[col].astype(str)
    df.to_parquet(PROCESSED_PARQUET, index=False)
    print(f"Saved parquet: {PROCESSED_PARQUET}")


def load_processed() -> pd.DataFrame:
    if not PROCESSED_PARQUET.exists():
        raise FileNotFoundError(
            "Processed parquet not found. Run backend/scripts/bootstrap.py first."
        )
    df = pd.read_parquet(PROCESSED_PARQUET)
    # Re-parse datetime columns
    for col in TIMESTAMP_COLS:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=False, errors="coerce")
    return df


if __name__ == "__main__":
    df = load_and_clean()
    save_processed(df)
