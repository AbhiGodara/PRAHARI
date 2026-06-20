import pandas as pd
from eis import score_event
from deploy_logic import recommend_manpower
from config import DEFAULT_OFFICER_POOL


def run_allocation(df: pd.DataFrame, police_station: str,
                   window_start=None, window_end=None,
                   officer_pool: int = DEFAULT_OFFICER_POOL) -> dict:
    """
    Greedy allocation: sort events in window by EIS desc, assign manpower
    until pool exhausted. Returns allocations with covered/not-covered status.
    """
    station_df = df[df["police_station"] == police_station].copy()

    if window_start is None or window_end is None:
        # Auto-select busiest historical (station, hour) slot
        window_start, window_end = _busiest_hour_window(station_df)

    ws = pd.Timestamp(window_start)
    we = pd.Timestamp(window_end)

    # Filter to active events in the window
    start_col = pd.to_datetime(station_df["start_datetime"], errors="coerce")
    if start_col.dt.tz is not None:
        start_col = start_col.dt.tz_localize(None)
    ws_naive = ws.tz_localize(None) if ws.tzinfo else ws
    we_naive = we.tz_localize(None) if we.tzinfo else we

    in_window = station_df[
        (start_col >= ws_naive) & (start_col <= we_naive)
    ].copy()

    # Score each event
    rows = []
    active_df = df[df["is_currently_active"]] if "is_currently_active" in df.columns else df
    for _, r in in_window.iterrows():
        event_dict = {
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "event_cause": r.get("event_cause", "others"),
            "event_type": r.get("event_type", "unplanned"),
            "requires_road_closure": r.get("requires_road_closure", False),
            "corridor": r.get("corridor", "Non-corridor"),
            "junction": r.get("junction", ""),
            "police_station": police_station,
            "veh_type": r.get("veh_type", "unknown"),
            "hour": r.get("hour"),
            "dow": r.get("dow"),
            "priority": r.get("priority", "High"),
        }
        scored = score_event(event_dict, active_df)
        manpower = recommend_manpower(
            scored["eis"], event_dict["event_cause"], event_dict["requires_road_closure"]
        )
        rows.append({
            "event_id": str(r.get("id", r.name)),
            "event_cause": event_dict["event_cause"],
            "eis": scored["eis"],
            "requested_officers": manpower["count"],
        })

    # Greedy allocation sorted by EIS descending
    rows.sort(key=lambda x: x["eis"], reverse=True)
    remaining = officer_pool
    total_requested = sum(r["requested_officers"] for r in rows)
    allocations = []
    for r in rows:
        needed = r["requested_officers"]
        given = min(needed, remaining)
        remaining -= given
        allocations.append({
            "event_id": r["event_id"],
            "event_cause": r["event_cause"],
            "eis": r["eis"],
            "requested_officers": needed,
            "allocated_officers": given,
            "covered": given >= needed,
        })

    return {
        "window_start": str(ws),
        "window_end": str(we),
        "allocations": allocations,
        "total_requested": total_requested,
        "total_pool": officer_pool,
    }


def _busiest_hour_window(station_df: pd.DataFrame):
    """Return the start/end of the historical hour-slot with most concurrent events."""
    if station_df.empty:
        now = pd.Timestamp.now()
        return str(now), str(now + pd.Timedelta(hours=1))

    col = pd.to_datetime(station_df["start_datetime"], errors="coerce")
    if col.dt.tz is not None:
        col = col.dt.tz_localize(None)
    station_df = station_df.copy()
    station_df["_h"] = col.dt.floor("H")
    busiest = station_df.groupby("_h").size().idxmax()
    return str(busiest), str(busiest + pd.Timedelta(hours=1))
