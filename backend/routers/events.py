import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from schemas import (
    ActiveEventsResponse, HeatmapResponse, TriageRequest, TriageResponse,
    ActiveEvent, EISComponents, ManpowerRecommendation, BarricadePoint, DiversionRecommendation,
)
from db import get_db, Prediction
from data_pipeline import load_processed
from eis import score_event
from deploy_logic import recommend_manpower, recommend_barricade_points, recommend_diversion

router = APIRouter(prefix="/events")
_df = None


def get_df():
    global _df
    if _df is None:
        _df = load_processed()
    return _df


@router.get("/active", response_model=ActiveEventsResponse)
def active_events(cause: str = Query(None), zone: str = Query(None)):
    df = get_df()
    active = df[df["is_currently_active"]].copy()
    if cause:
        active = active[active["event_cause"] == cause]
    if zone:
        active = active[active["zone"] == zone]

    active_df = df[df["is_currently_active"]]
    events = []
    for _, row in active.head(200).iterrows():
        event_dict = {
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "event_cause": row["event_cause"],
            "event_type": row.get("event_type", "unplanned"),
            "requires_road_closure": row["requires_road_closure"],
            "corridor": row.get("corridor", "Non-corridor"),
            "junction": row.get("junction", ""),
            "police_station": row.get("police_station", ""),
            "veh_type": row.get("veh_type", "unknown"),
            "hour": row.get("hour"),
            "dow": row.get("dow"),
            "priority": row.get("priority", "High"),
        }
        scored = score_event(event_dict, active_df)
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
    return ActiveEventsResponse(events=events)


@router.get("/heatmap", response_model=HeatmapResponse)
def heatmap():
    df = get_df()
    counts = df.groupby(["gy", "gx"]).size().reset_index(name="n")
    max_n = counts["n"].max()
    points = [
        [float(r["gy"]), float(r["gx"]), float(r["n"] / max_n)]
        for _, r in counts.iterrows()
    ]
    return HeatmapResponse(points=points)


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
