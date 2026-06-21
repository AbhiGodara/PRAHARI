import json
import numpy as np
import joblib
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from config import DURATION_MODEL_FILE, DURATION_METRICS_FILE, MODELS_STORE_DIR
from db import Debrief, Prediction
from models.model_utils import (
    make_preprocessor, temporal_split, prepare_X,
    NUMERIC_FEATURES_DURATION, add_engineered_features, load_cause_stats,
)
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingRegressor


def retrain_duration_model(session: Session, df_base: pd.DataFrame) -> dict:
    """
    Append debrief outcomes to training set and retrain duration model.
    Returns before/after MAE for the frontend before/after chart.
    """
    with open(DURATION_METRICS_FILE) as f:
        current_metrics = json.load(f)
    before_mae = current_metrics["mae_hours"]

    debriefs = session.query(Debrief).all()
    n_debriefs = len(debriefs)

    if n_debriefs == 0:
        return {
            "before_mae_hours": before_mae,
            "after_mae_hours":  before_mae,
            "n_debriefs_used":  0,
            "retrained_at":     datetime.now(timezone.utc).isoformat(),
        }

    pred_ids = {d.event_id for d in debriefs}
    preds = {p.event_id: p for p in session.query(Prediction).filter(
        Prediction.event_id.in_(pred_ids)
    ).all()}

    augment_rows = []
    for d in debriefs:
        p = preds.get(d.event_id)
        if p is None or not p.inputs_json:
            continue
        inputs = json.loads(p.inputs_json)
        # Use naive date string to avoid tz-aware / tz-naive mixing
        triaged = p.triaged_at.strftime("%Y-%m-%d %H:%M:%S") if p.triaged_at else "2024-01-01 00:00:00"
        row = {
            "event_cause":           inputs.get("event_cause", "others"),
            "event_type":            inputs.get("event_type", "unplanned"),
            "hour":                  inputs.get("hour", 12),
            "dow":                   inputs.get("dow", 0),
            "is_weekend":            int(inputs.get("dow", 0) in [5, 6]),
            "month":                 1,
            "corridor":              inputs.get("corridor") or "Non-corridor",
            "veh_type":              inputs.get("veh_type") or "unknown",
            "priority":              "High",
            "requires_road_closure": bool(inputs.get("requires_road_closure", False)),
            "latitude":              inputs.get("latitude", 12.97),
            "longitude":             inputs.get("longitude", 77.59),
            "junction":              inputs.get("junction") or "",
            "duration_hours":        d.actual_duration_hours,
            "duration_trainable":    True,
            "start_datetime":        triaged,
        }
        augment_rows.append(row)

    df_aug = pd.DataFrame(augment_rows)

    # Temporal-split the base set, strip tz from start_datetime
    trainable = df_base[df_base["duration_trainable"]].copy()
    col = pd.to_datetime(trainable["start_datetime"], errors="coerce")
    if col.dt.tz is not None:
        trainable["start_datetime"] = col.dt.tz_localize(None).astype(str)
    else:
        trainable["start_datetime"] = col.astype(str)

    df_combined = pd.concat([trainable, df_aug], ignore_index=True)

    cause_stats = load_cause_stats()
    train_df, test_df = temporal_split(df_combined)

    train_eng = add_engineered_features(train_df, cause_stats)
    test_eng  = add_engineered_features(test_df,  cause_stats)

    X_train = prepare_X(train_eng, for_closure=False)
    y_train = np.log1p(train_eng["duration_hours"].values)
    X_test  = prepare_X(test_eng, for_closure=False)
    y_test  = test_eng["duration_hours"].values

    # Reload best config from saved metrics
    best_config = current_metrics.get("best_config", "abs_err_500_lr05")
    from models.train_duration_model import CONFIGS
    cfg_kwargs = dict(next(
        (kw for lbl, kw in CONFIGS if lbl == best_config),
        CONFIGS[2][1]  # fallback to abs_err_500_lr05
    ))
    use_log = cfg_kwargs.get("loss", "squared_error") != "gamma"

    pipeline = Pipeline([
        ("pre",   make_preprocessor(NUMERIC_FEATURES_DURATION)),
        ("model", HistGradientBoostingRegressor(**cfg_kwargs)),
    ])
    y_tr = y_train if use_log else train_eng["duration_hours"].values.clip(min=0.01)
    pipeline.fit(X_train, y_tr)

    y_pred = (np.expm1(pipeline.predict(X_test)) if use_log else pipeline.predict(X_test)).clip(min=0)
    after_mae = float(np.mean(np.abs(y_pred - y_test)))

    MODELS_STORE_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "use_log_target": use_log}, DURATION_MODEL_FILE)

    new_metrics = {**current_metrics, "mae_hours": round(after_mae, 3), "n_debriefs": n_debriefs}
    with open(DURATION_METRICS_FILE, "w") as f:
        json.dump(new_metrics, f, indent=2)

    import eis as _eis
    _eis._dur_bundle = None

    return {
        "before_mae_hours": round(before_mae, 3),
        "after_mae_hours":  round(after_mae, 3),
        "n_debriefs_used":  n_debriefs,
        "retrained_at":     datetime.now(timezone.utc).isoformat(),
    }
