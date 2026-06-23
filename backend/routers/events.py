import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from schemas import (
    ActiveEventsResponse, HeatmapResponse, TriageRequest, TriageResponse,
    ActiveEvent, EISComponents, ManpowerRecommendation, BarricadePoint, DiversionRecommendation,
)
from db import get_db, Prediction
from data_pipeline import load_processed
from eis import score_event, score_events_batch
from deploy_logic import recommend_manpower, recommend_barricade_points, recommend_diversion

router = APIRouter(prefix="/events")
_df = None
_active_events_cache_bytes = None   # cached raw JSON bytes — skip serialization overhead
_heatmap_cache_bytes = None         # cached raw JSON bytes


def get_df():
    global _df
    if _df is None:
        _df = load_processed()
    return _df


@router.get("/active")
def active_events(cause: str = Query(None), zone: str = Query(None)):
    global _active_events_cache_bytes
    # Serve from cache when no filters (the common/demo case) — skips all serialization
    if cause is None and zone is None and _active_events_cache_bytes is not None:
        return Response(content=_active_events_cache_bytes, media_type="application/json")

    df = get_df()
    active = df[df["is_currently_active"]].copy()
    if cause:
        active = active[active["event_cause"] == cause]
    if zone:
        active = active[active["zone"] == zone]

    active_df = df[df["is_currently_active"]]
    subset = active.head(100)

    # Build event dicts for batch scoring
    event_dicts = []
    for _, row in subset.iterrows():
        event_dicts.append({
            "event_id":             str(row.get("id", "")),
            "latitude":             row["latitude"],
            "longitude":            row["longitude"],
            "event_cause":          row["event_cause"],
            "event_type":           row.get("event_type", "unplanned"),
            "requires_road_closure": row["requires_road_closure"],
            "corridor":             row.get("corridor", "Non-corridor"),
            "junction":             row.get("junction", ""),
            "police_station":       row.get("police_station", ""),
            "veh_type":             row.get("veh_type", "unknown"),
            "hour":                 row.get("hour"),
            "dow":                  row.get("dow"),
            "priority":             row.get("priority", "High"),
        })

    # Batch score all events in ONE ML call instead of 100 individual calls
    scored_list = score_events_batch(event_dicts, active_df)

    events = []
    for i, (_, row) in enumerate(subset.iterrows()):
        scored = scored_list[i]
        events.append(ActiveEvent(
            event_id=str(row.get("id", "")),
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
            event_cause=row["event_cause"],
            police_station=str(row.get("police_station", "")),
            eis=scored["eis"],
            priority=str(row.get("priority", "High")),
            requires_road_closure=bool(row["requires_road_closure"]),
            start_datetime=str(row.get("start_datetime", "")),
        ))
    result = ActiveEventsResponse(events=events)
    result_bytes = result.model_dump_json().encode()
    # Cache only the unfiltered result as raw bytes
    if cause is None and zone is None:
        _active_events_cache_bytes = result_bytes
    return Response(content=result_bytes, media_type="application/json")


@router.get("/heatmap")
def heatmap():
    global _heatmap_cache_bytes
    if _heatmap_cache_bytes is not None:
        return Response(content=_heatmap_cache_bytes, media_type="application/json")
    df = get_df()
    counts = df.groupby(["gy", "gx"]).size().reset_index(name="n")
    max_n = counts["n"].max()
    points = [
        [float(r["gy"]), float(r["gx"]), float(r["n"] / max_n)]
        for _, r in counts.iterrows()
    ]
    result = HeatmapResponse(points=points)
    _heatmap_cache_bytes = result.model_dump_json().encode()
    return Response(content=_heatmap_cache_bytes, media_type="application/json")


@router.post("/triage", response_model=TriageResponse)
def triage(req: TriageRequest, db: Session = Depends(get_db)):
    df = get_df()
    active_df = df[df["is_currently_active"]]
    event_id = "EV-" + uuid.uuid4().hex[:8].upper()

    event_dict = req.model_dump()
    event_dict["event_id"] = event_id
    event_dict["priority"] = "High"  # default for new events

    scored = score_event(event_dict, active_df)
    manpower = recommend_manpower(scored["eis"], req.event_cause, req.requires_road_closure)

    # Barricade points
    route_path = ""
    if req.junction:
        junc_rows = df[df["junction"] == req.junction]
        if not junc_rows.empty and "route_path" in junc_rows.columns:
            route_path = str(junc_rows.iloc[0].get("route_path", ""))
    bps = recommend_barricade_points(
        req.latitude, req.longitude,
        req.junction or "", req.corridor or "",
        route_path
    )

    # Diversion
    diversion = recommend_diversion(req.latitude, req.longitude, req.junction or "", req.event_cause, df)

    # Persist prediction to SQLite
    prediction = Prediction(
        event_id=event_id,
        inputs_json=json.dumps(req.model_dump()),
        eis=scored["eis"],
        predicted_duration_hours=scored["predicted_duration_hours"],
        closure_probability=scored["closure_probability"],
        event_cause=req.event_cause,
        triaged_at=datetime.now(timezone.utc),
    )
    db.add(prediction)
    db.commit()

    comp = scored["components"]
    return TriageResponse(
        event_id=event_id,
        eis=scored["eis"],
        predicted_duration_hours=scored["predicted_duration_hours"],
        closure_probability=scored["closure_probability"],
        components=EISComponents(
            duration_score=comp["duration_score"],
            closure_score=comp["closure_score"],
            location_score=comp["location_score"],
            concurrency_score=comp["concurrency_score"],
            cause_severity_score=comp["cause_severity_score"],
        ),
        manpower=ManpowerRecommendation(**manpower),
        barricade_points=[BarricadePoint(**b) for b in bps],
        diversion=DiversionRecommendation(**diversion),
    )
