import uuid
import numpy as np
import joblib
import pandas as pd
from config import (
    EIS_WEIGHT_DURATION, EIS_WEIGHT_CLOSURE, EIS_WEIGHT_LOCATION,
    EIS_WEIGHT_CONCURRENCY, EIS_WEIGHT_CAUSE_SEVERITY, EIS_DURATION_CAP_HOURS,
    DURATION_MODEL_FILE, CLOSURE_MODEL_FILE, GRID_RESOLUTION,
)
from location_priors import load_location_priors, lookup_location_criticality
from models.model_utils import (
    prepare_X, add_engineered_features, load_cause_stats,
)

CAUSE_SEVERITY_MAP = {
    "vip_movement":      0.90,
    "public_event":      0.70,
    "protest":           0.65,
    "procession":        0.60,
    "construction":      0.55,
    "tree_fall":         0.50,
    "water_logging":     0.48,
    "road_conditions":   0.45,
    "accident":          0.40,
    "congestion":        0.38,
    "vehicle_breakdown": 0.30,
    "pot_holes":         0.25,
    "debris":            0.20,
    "fog_low_visibility":0.15,
    "others":            0.35,
}

_dur_bundle  = None   # {"pipeline": ..., "use_log_target": bool}
_closure_model = None
_priors = None
_cause_stats = None


def _load_models():
    global _dur_bundle, _closure_model, _priors, _cause_stats
    if _dur_bundle is None:
        _dur_bundle = joblib.load(DURATION_MODEL_FILE)
    if _closure_model is None:
        _closure_model = joblib.load(CLOSURE_MODEL_FILE)
    if _priors is None:
        _priors = load_location_priors()
    if _cause_stats is None:
        _cause_stats = load_cause_stats()


def score_event(event_dict: dict, df_active=None) -> dict:
    _load_models()

    cause  = str(event_dict.get("event_cause", "others")).lower().strip()
    _h     = event_dict.get("hour")
    hour   = int(_h) if _h is not None and pd.notna(_h) else pd.Timestamp.now(tz="Asia/Kolkata").hour
    _d     = event_dict.get("dow")
    dow    = int(_d) if _d is not None and pd.notna(_d) else pd.Timestamp.now(tz="Asia/Kolkata").dayofweek
    is_weekend   = int(dow in [5, 6])
    corridor     = str(event_dict.get("corridor") or "Non-corridor")
    junction     = str(event_dict.get("junction") or "")
    police_station = str(event_dict.get("police_station") or "")
    veh_type     = str(event_dict.get("veh_type") or "unknown")
    requires_road_closure = bool(event_dict.get("requires_road_closure", False))
    event_type   = str(event_dict.get("event_type") or "unplanned")
    lat          = float(event_dict["latitude"])
    lng          = float(event_dict["longitude"])
    _m           = event_dict.get("month")
    month        = int(_m) if _m is not None and pd.notna(_m) else pd.Timestamp.now(tz="Asia/Kolkata").month

    row = pd.DataFrame([{
        "event_cause":           cause,
        "event_type":            event_type,
        "hour":                  hour,
        "dow":                   dow,
        "is_weekend":            is_weekend,
        "month":                 month,
        "corridor":              corridor,
        "veh_type":              veh_type,
        "priority":              event_dict.get("priority", "High"),
        "requires_road_closure": requires_road_closure,
        "latitude":              lat,
        "longitude":             lng,
        "junction":              junction,
        "police_station":        police_station,
        "zone":                  str(event_dict.get("zone") or "unknown"),
    }])

    # Add engineered features (cause stats + location criticality)
    row_eng = add_engineered_features(row, _cause_stats, _priors)

    X_dur = prepare_X(row_eng, for_closure=False)
    X_clo = prepare_X(row_eng, for_closure=True)

    dur_pipeline = _dur_bundle["pipeline"]
    use_log = _dur_bundle["use_log_target"]
    raw_pred = dur_pipeline.predict(X_dur)[0]
    predicted_duration = float(max(0.0, np.expm1(raw_pred) if use_log else raw_pred))

    closure_prob = float(_closure_model.predict_proba(X_clo)[0, 1])

    location_score = lookup_location_criticality(lat, lng, junction, _priors, GRID_RESOLUTION)

    concurrency_score = 0.0
    if df_active is not None and police_station and "police_station" in df_active.columns:
        n_concurrent = (df_active["police_station"] == police_station).sum()
        concurrency_score = min(1.0, n_concurrent / 10.0)

    cause_severity = CAUSE_SEVERITY_MAP.get(cause, 0.35)

    dur_norm = min(1.0, predicted_duration / EIS_DURATION_CAP_HOURS)

    eis = 100 * (
        EIS_WEIGHT_DURATION    * dur_norm
        + EIS_WEIGHT_CLOSURE   * closure_prob
        + EIS_WEIGHT_LOCATION  * location_score
        + EIS_WEIGHT_CONCURRENCY * concurrency_score
        + EIS_WEIGHT_CAUSE_SEVERITY * cause_severity
    )
    eis = float(np.clip(eis, 0, 100))

    return {
        "event_id":   str(event_dict.get("event_id", uuid.uuid4().hex[:8].upper())),
        "eis":        round(eis, 2),
        "predicted_duration_hours": round(predicted_duration, 2),
        "closure_probability":      round(closure_prob, 3),
        "components": {
            "duration_score":       round(dur_norm    * 100, 2),
            "closure_score":        round(closure_prob * 100, 2),
            "location_score":       round(location_score * 100, 2),
            "concurrency_score":    round(concurrency_score * 100, 2),
            "cause_severity_score": round(cause_severity * 100, 2),
        },
    }
