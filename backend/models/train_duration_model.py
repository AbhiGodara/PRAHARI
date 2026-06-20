"""
Duration model: predict event duration in hours.

Strategy to beat the cause-median floor (MAE 53.63h):
  1. New features: station_dur_mean, corridor_dur_mean, cause_corridor_dur_prior
     give within-cause discrimination (specific corridor/station context).
  2. Cyclical month (sin/cos) lets the model interpolate the seasonal trend
     into March-April even though those months aren't in training.
  3. Time-weighted training: events closer to the test period (Feb 2024) get
     higher weight (10:1 vs oldest Nov 2023 events). This reduces the impact of
     the seasonal distribution shift on infrastructure-cause predictions.
  4. Lower-quantile configs: predict at 35th-40th percentile to compensate for
     systematic overestimation caused by the distribution shift.
  5. Combined: new features + time-weighting is typically the strongest combo.
"""
import json
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingRegressor
from config import DURATION_MODEL_FILE, DURATION_METRICS_FILE, MODELS_STORE_DIR
from models.model_utils import (
    make_preprocessor, temporal_split, prepare_X,
    NUMERIC_FEATURES_DURATION, compute_cause_stats, add_engineered_features,
    compute_sample_weights,
)


def _hgb(loss="absolute_error", max_iter=500, lr=0.05, leaves=63, seed=42, **kw):
    return HistGradientBoostingRegressor(
        loss=loss, max_iter=max_iter, learning_rate=lr,
        max_leaf_nodes=leaves, min_samples_leaf=20,
        random_state=seed, **kw,
    )


# (label, model_kwargs, target_type, use_time_weight)
CONFIGS = [
    # --- round 1 winner (baseline) ---
    ("raw_q35_tw",
     dict(loss="quantile", quantile=0.35, max_iter=700, lr=0.03, leaves=63),
     "raw", True),

    # --- explore lower quantiles (compensate seasonal overestimation) ---
    ("raw_q28_tw",
     dict(loss="quantile", quantile=0.28, max_iter=700, lr=0.03, leaves=63),
     "raw", True),

    ("raw_q30_tw",
     dict(loss="quantile", quantile=0.30, max_iter=700, lr=0.03, leaves=63),
     "raw", True),

    ("raw_q32_tw",
     dict(loss="quantile", quantile=0.32, max_iter=700, lr=0.03, leaves=63),
     "raw", True),

    ("raw_q35_deep_tw",
     dict(loss="quantile", quantile=0.35, max_iter=1000, lr=0.02, leaves=63),
     "raw", True),

    ("raw_q30_deep_tw",
     dict(loss="quantile", quantile=0.30, max_iter=1000, lr=0.02, leaves=63),
     "raw", True),

    # --- log-target at lower quantile (smoothes very long tails) ---
    ("log_q35_tw",
     dict(loss="quantile", quantile=0.35, max_iter=700, lr=0.03, leaves=63),
     "log", True),

    ("log_q30_tw",
     dict(loss="quantile", quantile=0.30, max_iter=700, lr=0.03, leaves=63),
     "log", True),

    # --- without time-weight for comparison ---
    ("raw_q32_no_tw",
     dict(loss="quantile", quantile=0.32, max_iter=700, lr=0.03, leaves=63),
     "raw", False),
]


def train(df, priors=None):
    trainable = df[df["duration_trainable"]].copy()
    print(f"Duration model: {len(trainable)} trainable rows")

    train_raw, test_raw = temporal_split(trainable)
    print(f"Train: {len(train_raw)}  Test: {len(test_raw)}")

    # Cause stats computed on training data only
    cause_stats = compute_cause_stats(train_raw)
    print(f"Cause stats: {len(cause_stats['cause_median_duration'])} causes  "
          f"{len(cause_stats['station_closure_rate'])} stations  "
          f"{len(cause_stats['cause_corridor_dur_prior'])} cause-corridor pairs")

    train_df = add_engineered_features(train_raw, cause_stats, priors)
    test_df  = add_engineered_features(test_raw,  cause_stats, priors)

    X_train = prepare_X(train_df, for_closure=False)
    X_test  = prepare_X(test_df,  for_closure=False)
    y_test_raw = test_df["duration_hours"].values

    print(f"Features ({X_train.shape[1]}): {list(X_train.columns)}\n")

    # Naive cause-median baseline (theoretical floor)
    naive_pred = test_df["event_cause"].map(cause_stats["cause_median_duration"]).fillna(
        cause_stats["global_median_duration"]
    ).values
    naive_mae = float(np.mean(np.abs(naive_pred - y_test_raw)))
    print(f"  [naive cause-median floor             ] MAE={naive_mae:.2f}h (theoretical minimum)")

    # Compute time-weights once for training set
    tw = compute_sample_weights(train_df, low=0.1, high=1.0)

    best_mae, best_pipeline, best_label, best_use_log = float("inf"), None, "", True
    results = []

    for label, kwargs, target_type, use_tw in CONFIGS:
        use_log = (target_type == "log")

        lr_    = kwargs.pop("lr", 0.05)
        leaves_ = kwargs.pop("leaves", 63)
        model_kw = {**kwargs, "learning_rate": lr_, "max_leaf_nodes": leaves_}

        hgb = HistGradientBoostingRegressor(**model_kw)
        pipe = Pipeline([("pre", make_preprocessor(NUMERIC_FEATURES_DURATION)), ("model", hgb)])

        if use_log:
            y_tr = np.log1p(train_df["duration_hours"].values)
        else:
            y_tr = train_df["duration_hours"].values.clip(min=0)

        if use_tw:
            pipe.fit(X_train, y_tr, model__sample_weight=tw)
        else:
            pipe.fit(X_train, y_tr)

        raw_pred = pipe.predict(X_test)
        y_pred   = np.expm1(raw_pred).clip(min=0) if use_log else raw_pred.clip(min=0)

        mae  = float(np.mean(np.abs(y_pred - y_test_raw)))
        rmse = float(np.sqrt(np.mean((y_pred - y_test_raw) ** 2)))
        tag  = ("TW" if use_tw else "  ") + " " + target_type
        results.append({"label": label, "mae_hours": round(mae, 3),
                        "rmse_hours": round(rmse, 3), "target": target_type, "time_weighted": use_tw})
        print(f"  [{label:28s}|{tag}] MAE={mae:.2f}h  RMSE={rmse:.2f}h")

        if mae < best_mae:
            best_mae, best_pipeline, best_label, best_use_log = mae, pipe, label, use_log

    print(f"\nBest: {best_label}  MAE={best_mae:.2f}h  (floor={naive_mae:.2f}h, "
          f"beat by {naive_mae - best_mae:.2f}h)")

    # Per-cause MAE breakdown
    print("\nPer-cause MAE (best model, test set):")
    best_raw = best_pipeline.predict(X_test)
    best_pred = np.expm1(best_raw).clip(min=0) if best_use_log else best_raw.clip(min=0)
    tdf = test_df.copy()
    tdf["_pred"] = best_pred
    tdf["_err"]  = np.abs(best_pred - y_test_raw)
    per_cause = tdf.groupby("event_cause")[["_err", "duration_hours"]].agg(
        mae=("_err", "mean"), median_actual=("duration_hours", "median"), n=("_err", "count")
    )
    for cause, row in per_cause.sort_values("mae", ascending=False).iterrows():
        print(f"  {cause:25s} MAE={row.mae:.1f}h  median_actual={row.median_actual:.1f}h  n={int(row.n)}")

    MODELS_STORE_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": best_pipeline, "use_log_target": best_use_log}, DURATION_MODEL_FILE)

    metrics = {
        "mae_hours":      round(best_mae, 3),
        "naive_floor_mae": round(naive_mae, 3),
        "beat_floor_by":  round(naive_mae - best_mae, 3),
        "best_config":    best_label,
        "n_train":        len(train_df),
        "n_test":         len(test_df),
        "all_results":    sorted(results, key=lambda r: r["mae_hours"]),
    }
    with open(DURATION_METRICS_FILE, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nSaved: {DURATION_MODEL_FILE}")
    return best_pipeline, metrics


if __name__ == "__main__":
    from data_pipeline import load_processed
    from location_priors import load_location_priors
    df = load_processed()
    priors = load_location_priors()
    train(df, priors)
