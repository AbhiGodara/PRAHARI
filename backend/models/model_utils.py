import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from config import TRAIN_TEST_SPLIT_DATE, MODELS_STORE_DIR

CAUSE_GROUPS = {
    'vehicle_breakdown': 'incident',   'accident': 'incident',
    'tree_fall': 'incident',           'fog_low_visibility': 'incident',
    'debris': 'incident',
    'construction': 'infrastructure',  'water_logging': 'infrastructure',
    'pot_holes': 'infrastructure',     'road_conditions': 'infrastructure',
    'public_event': 'social',          'procession': 'social',
    'vip_movement': 'social',          'protest': 'social',
    'congestion': 'social',            'others': 'social',
}

CAUSE_STATS_FILE = MODELS_STORE_DIR / "cause_stats.json"

CATEGORICAL_FEATURES = ["event_cause", "corridor", "veh_type", "priority", "cause_group"]
# Extra categoricals for closure model (54 stations + 12 zones → richer RF splits)
CATEGORICAL_FEATURES_CLOSURE = CATEGORICAL_FEATURES + ["police_station", "zone"]

NUMERIC_FEATURES_DURATION = [
    "hour", "dow", "is_weekend", "requires_road_closure",
    "month", "month_sin", "month_cos",   # cyclical: model can interpolate Mar from Jan-Feb trend
    "is_planned",
    "cause_log_median_dur",              # strong cause-level prior
    "location_criticality",              # empirical-Bayes spatial prior
    "station_dur_mean",                  # EB-smoothed mean log-dur per station
    "corridor_dur_mean",                 # EB-smoothed mean log-dur per corridor
    "cause_corridor_dur_prior",          # cause x corridor interaction prior
]

NUMERIC_FEATURES_CLOSURE = [
    "hour", "dow", "is_weekend",
    "month", "month_sin", "month_cos",
    "is_planned",
    "cause_closure_rate",                # historical closure rate per cause
    "station_closure_rate",              # EB-smoothed closure rate per station
    "corridor_closure_rate",             # EB-smoothed closure rate per corridor
    "junction_closure_rate",             # EB-smoothed closure rate per junction (0=no junction)
    "has_junction",                      # 1 if named junction provided
    "cause_station_closure_rate",        # EB-smoothed rate per (cause, station) pair
    "cause_corridor_closure_rate",       # EB-smoothed rate per (cause, corridor) pair
    "zone_closure_rate",                 # EB-smoothed closure rate per zone
    "veh_type_closure_rate",             # EB-smoothed closure rate per veh_type
    "location_criticality",
]

ALL_FEATURES_DURATION = CATEGORICAL_FEATURES + NUMERIC_FEATURES_DURATION
ALL_FEATURES_CLOSURE  = CATEGORICAL_FEATURES_CLOSURE + NUMERIC_FEATURES_CLOSURE


def make_preprocessor(numeric_features=None, for_closure=False):
    cat_cols = CATEGORICAL_FEATURES_CLOSURE if for_closure else CATEGORICAL_FEATURES
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ],
        remainder="passthrough",
    )


def temporal_split(df: pd.DataFrame, date_col: str = "start_datetime"):
    split = pd.Timestamp(TRAIN_TEST_SPLIT_DATE)
    col = pd.to_datetime(df[date_col], errors="coerce")
    if col.dt.tz is not None:
        col = col.dt.tz_localize(None)
    train = df[col < split].copy()
    test  = df[col >= split].copy()
    return train, test


def _eb_rate(df, group_col, target_col, k=5):
    """Empirical-Bayes smoothed rate: (n*rate + k*global) / (n+k)."""
    global_mean = float(df[target_col].mean())
    agg = df.groupby(group_col)[target_col].agg(["sum", "count"])
    smoothed = (agg["sum"] + k * global_mean) / (agg["count"] + k)
    return smoothed.to_dict(), global_mean


def _eb_mean_log(df, group_col, value_col, k=5):
    """EB-smoothed mean of log1p(value) per group."""
    log_vals = np.log1p(df[value_col].clip(lower=0))
    global_mean = float(log_vals.mean()) if len(log_vals) > 0 else 0.0
    agg = log_vals.groupby(df[group_col]).agg(["sum", "count"])
    smoothed = (agg["sum"] + k * global_mean) / (agg["count"] + k)
    return smoothed.to_dict(), global_mean


def compute_cause_stats(train_df: pd.DataFrame) -> dict:
    """Compute all priors from training data only. Call before any feature engineering."""
    trainable = train_df[train_df["duration_trainable"]]

    # --- cause-level ---
    dur_median = trainable.groupby("event_cause")["duration_hours"].median().to_dict()
    global_dur = float(trainable["duration_hours"].median()) if len(trainable) > 0 else 1.0
    clo_rate = train_df.groupby("event_cause")["requires_road_closure"].mean().to_dict()
    global_clo = float(train_df["requires_road_closure"].mean())

    # --- station-level (EB-smoothed, k=5) ---
    sta_clo, _   = _eb_rate(train_df, "police_station", "requires_road_closure", k=5)
    sta_dur, g_sd = _eb_mean_log(trainable, "police_station", "duration_hours", k=5)

    # --- corridor-level (EB-smoothed, k=5) ---
    cor_clo, _   = _eb_rate(train_df, "corridor", "requires_road_closure", k=5)
    cor_dur, g_cd = _eb_mean_log(trainable, "corridor", "duration_hours", k=5)

    # --- junction-level (EB-smoothed, k=3 — sparse) ---
    junc_df = train_df[train_df["junction"].str.strip() != ""]
    junc_clo: dict = {}
    if len(junc_df) > 0:
        junc_clo, _ = _eb_rate(junc_df, "junction", "requires_road_closure", k=3)

    # --- zone-level (EB-smoothed, k=5) ---
    zone_col = train_df["zone"] if "zone" in train_df.columns else pd.Series(["unknown"] * len(train_df), index=train_df.index)
    zone_clo, _ = _eb_rate(train_df.assign(zone=zone_col.fillna("unknown")), "zone", "requires_road_closure", k=5)

    # --- veh_type-level (EB-smoothed, k=5) ---
    vt_clo, _ = _eb_rate(train_df, "veh_type", "requires_road_closure", k=5)

    # --- cause x station closure rate (fine-grained, k=3) ---
    cs_clo: dict = {}
    for (cause, sta), grp in train_df.groupby(["event_cause", "police_station"]):
        if len(grp) >= 3:
            n = len(grp); rate = grp["requires_road_closure"].mean()
            cs_clo[f"{cause}||{sta}"] = float((n * rate + 3 * global_clo) / (n + 3))

    # --- cause x corridor closure rate (fine-grained, k=3) ---
    cc_clo: dict = {}
    for (cause, cor), grp in train_df.groupby(["event_cause", "corridor"]):
        if len(grp) >= 3:
            n = len(grp); rate = grp["requires_road_closure"].mean()
            cc_clo[f"{cause}||{cor}"] = float((n * rate + 3 * global_clo) / (n + 3))

    # --- cause x corridor duration prior (only for cell with >= 5 obs) ---
    cc_dur: dict = {}
    for (cause, cor), grp in trainable.groupby(["event_cause", "corridor"]):
        if len(grp) >= 5:
            cc_dur[f"{cause}||{cor}"] = float(np.log1p(grp["duration_hours"]).mean())

    stats = {
        # cause-level
        "cause_median_duration":   {k: float(v) for k, v in dur_median.items()},
        "cause_closure_rate":      {k: float(v) for k, v in clo_rate.items()},
        "global_median_duration":  global_dur,
        "global_closure_rate":     global_clo,
        # station-level
        "station_closure_rate":    {k: float(v) for k, v in sta_clo.items()},
        "station_dur_mean":        {k: float(v) for k, v in sta_dur.items()},
        "global_station_dur_mean": g_sd,
        # corridor-level
        "corridor_closure_rate":   {k: float(v) for k, v in cor_clo.items()},
        "corridor_dur_mean":       {k: float(v) for k, v in cor_dur.items()},
        "global_corridor_dur_mean": g_cd,
        # junction-level
        "junction_closure_rate":      {k: float(v) for k, v in junc_clo.items()},
        # zone / veh_type rates
        "zone_closure_rate":          {k: float(v) for k, v in zone_clo.items()},
        "veh_type_closure_rate":      {k: float(v) for k, v in vt_clo.items()},
        # cause x station / cause x corridor closure rates
        "cause_station_closure_rate": cs_clo,
        "cause_corridor_closure_rate": cc_clo,
        # cause x corridor duration prior
        "cause_corridor_dur_prior":   cc_dur,
    }

    MODELS_STORE_DIR.mkdir(parents=True, exist_ok=True)
    with open(CAUSE_STATS_FILE, "w") as f:
        json.dump(stats, f)
    return stats


def load_cause_stats() -> dict:
    with open(CAUSE_STATS_FILE) as f:
        return json.load(f)


def add_engineered_features(df: pd.DataFrame, cause_stats: dict, priors: dict = None) -> pd.DataFrame:
    df = df.copy()

    # --- cause group ---
    df["cause_group"] = df["event_cause"].map(CAUSE_GROUPS).fillna("social")

    # --- cause duration prior (log-scaled) ---
    global_dur = cause_stats.get("global_median_duration", 1.0)
    df["cause_log_median_dur"] = (
        df["event_cause"]
        .map(cause_stats["cause_median_duration"])
        .fillna(global_dur)
        .clip(lower=0.01)
        .apply(np.log1p)
    )

    # --- cause closure rate ---
    global_clo = cause_stats.get("global_closure_rate", 0.08)
    df["cause_closure_rate"] = (
        df["event_cause"].map(cause_stats["cause_closure_rate"]).fillna(global_clo)
    )

    # --- station-level features ---
    sta_col = df["police_station"] if "police_station" in df.columns else pd.Series(["unknown"] * len(df), index=df.index)
    g_sc = global_clo
    df["station_closure_rate"] = sta_col.map(cause_stats.get("station_closure_rate", {})).fillna(g_sc)
    g_sd = cause_stats.get("global_station_dur_mean", np.log1p(global_dur))
    df["station_dur_mean"] = sta_col.map(cause_stats.get("station_dur_mean", {})).fillna(g_sd)

    # --- corridor-level features ---
    cor_col = df["corridor"] if "corridor" in df.columns else pd.Series(["unknown"] * len(df), index=df.index)
    g_cc = global_clo
    df["corridor_closure_rate"] = cor_col.map(cause_stats.get("corridor_closure_rate", {})).fillna(g_cc)
    g_cd = cause_stats.get("global_corridor_dur_mean", np.log1p(global_dur))
    df["corridor_dur_mean"] = cor_col.map(cause_stats.get("corridor_dur_mean", {})).fillna(g_cd)

    # --- junction-level features ---
    junc_col = df["junction"].astype(str).str.strip() if "junction" in df.columns else pd.Series([""] * len(df), index=df.index)
    df["has_junction"] = (junc_col != "").astype(int)
    # Named junction with no training history -> fall back to global
    df["junction_closure_rate"] = junc_col.map(cause_stats.get("junction_closure_rate", {})).fillna(global_clo)
    # For rows without a junction, reset to global (we don't have specific info)
    df.loc[junc_col == "", "junction_closure_rate"] = global_clo

    # --- zone-level closure rate ---
    zone_col = df["zone"].fillna("unknown") if "zone" in df.columns else pd.Series(["unknown"] * len(df), index=df.index)
    df["zone_closure_rate"] = zone_col.map(cause_stats.get("zone_closure_rate", {})).fillna(global_clo)

    # --- veh_type closure rate ---
    vt_col = df["veh_type"].fillna("unknown") if "veh_type" in df.columns else pd.Series(["unknown"] * len(df), index=df.index)
    df["veh_type_closure_rate"] = vt_col.map(cause_stats.get("veh_type_closure_rate", {})).fillna(global_clo)

    # --- cause x station closure rate ---
    cs_key = df["event_cause"].astype(str) + "||" + sta_col.astype(str)
    df["cause_station_closure_rate"] = cs_key.map(
        cause_stats.get("cause_station_closure_rate", {})
    ).fillna(df["cause_closure_rate"])   # fallback: use cause-level rate

    # --- cause x corridor closure rate ---
    cc_clo_key = df["event_cause"].astype(str) + "||" + cor_col.astype(str)
    df["cause_corridor_closure_rate"] = cc_clo_key.map(
        cause_stats.get("cause_corridor_closure_rate", {})
    ).fillna(df["cause_closure_rate"])

    # --- cause x corridor duration prior ---
    cc_dur_key = df["event_cause"].astype(str) + "||" + cor_col.astype(str)
    g_ccp = np.log1p(global_dur)
    df["cause_corridor_dur_prior"] = cc_dur_key.map(
        cause_stats.get("cause_corridor_dur_prior", {})
    ).fillna(g_ccp)

    # --- is planned ---
    if "event_type" in df.columns:
        df["is_planned"] = (df["event_type"].astype(str).str.lower() == "planned").astype(int)
    else:
        df["is_planned"] = 0

    # --- month (ensure exists) ---
    if "month" not in df.columns or df["month"].isna().all():
        df["month"] = 1

    # --- cyclical month encoding ---
    m = pd.to_numeric(df["month"], errors="coerce").fillna(1)
    df["month_sin"] = np.sin(2 * np.pi * m / 12)
    df["month_cos"] = np.cos(2 * np.pi * m / 12)

    # --- location criticality from priors ---
    if priors is not None:
        from location_priors import lookup_location_criticality
        from config import GRID_RESOLUTION
        crits = []
        for _, row in df.iterrows():
            crits.append(lookup_location_criticality(
                float(row.get("latitude", 12.97)),
                float(row.get("longitude", 77.59)),
                str(row.get("junction", "") or ""),
                priors,
                GRID_RESOLUTION,
            ))
        df["location_criticality"] = crits
    else:
        df["location_criticality"] = 0.5

    return df


def compute_sample_weights(train_df: pd.DataFrame, date_col: str = "start_datetime",
                            low: float = 0.15, high: float = 1.0) -> np.ndarray:
    """Recent training events get higher weight (addresses seasonal distribution shift)."""
    col = pd.to_datetime(train_df[date_col], errors="coerce")
    if col.dt.tz is not None:
        col = col.dt.tz_localize(None)
    d_min = col.min()
    d_range = max((col.max() - d_min).days, 1)
    frac = (col - d_min).dt.days / d_range
    return (frac * (high - low) + low).fillna(low).values


def prepare_X(df: pd.DataFrame, for_closure: bool = False) -> pd.DataFrame:
    features = ALL_FEATURES_CLOSURE if for_closure else ALL_FEATURES_DURATION
    available = [c for c in features if c in df.columns]
    X = df[available].copy()
    if "requires_road_closure" in X.columns:
        X["requires_road_closure"] = X["requires_road_closure"].astype(int)
    if "is_planned" in X.columns:
        X["is_planned"] = X["is_planned"].astype(int)
    cat_cols = CATEGORICAL_FEATURES_CLOSURE if for_closure else CATEGORICAL_FEATURES
    for col in cat_cols:
        if col in X.columns:
            X[col] = X[col].fillna("unknown").astype(str)
    numeric_cols = [c for c in X.columns if c not in cat_cols]
    for col in numeric_cols:
        if X[col].isna().any():
            med = X[col].median()
            X[col] = X[col].fillna(med if pd.notna(med) else 0)
    return X
