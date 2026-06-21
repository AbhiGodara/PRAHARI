import math
from typing import Optional
import pandas as pd
from config import OFFICER_BAND, DIVERSION_RADIUS_DEG


def recommend_manpower(eis: float, cause: str, requires_road_closure: bool) -> dict:
    """Rule-based manpower recommendation based on EIS band."""
    count = 0
    if eis >= 80:
        count = 7
        rationale = f"High-impact event (EIS {eis:.0f}): 6-8 officers required"
        if requires_road_closure:
            rationale += "; traffic warden support recommended for road closure"
    elif eis >= 50:
        count = 4
        rationale = f"Moderate-impact event (EIS {eis:.0f}): 3-5 officers required"
    elif eis >= 20:
        count = 2
        rationale = f"Low-to-moderate event (EIS {eis:.0f}): 1-2 officers required"
    else:
        count = 1
        rationale = f"Low-impact event (EIS {eis:.0f}): monitor only, 0-1 officer"

    # VIP movement override
    if cause == "vip_movement":
        count = max(count, 4)
        rationale += " [override: vip_movement always >= tier-2 staffing per protocol]"

    return {"count": count, "rationale": rationale}


def recommend_barricade_points(
    lat: float, lng: float, junction: str, corridor: str, route_path_json: str = ""
) -> list:
    """Extract barricade points from route_path if available, else use event location."""
    points = []

    if route_path_json and route_path_json not in ("[]", "", "null"):
        try:
            import json
            coords = json.loads(route_path_json)
            if coords and len(coords) >= 2:
                points.append({"lat": float(coords[0][0]), "lng": float(coords[0][1]),
                                "label": "Route start - barricade here"})
                points.append({"lat": float(coords[-1][0]), "lng": float(coords[-1][1]),
                                "label": "Route end - barricade here"})
                return points
        except Exception:
            pass

    loc_label = junction if junction and junction.strip() else (corridor or "event location")
    points.append({"lat": lat, "lng": lng,
                   "label": f"Recommend barricading both directions at {loc_label} - no precise geometry on record"})
    return points


def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def recommend_diversion(
    lat: float, lng: float, junction: str, cause: str, df: pd.DataFrame
) -> dict:
    """
    Nearest-neighbor diversion lookup from historical route_path data.
    Returns found route or honest fallback — never fabricates.
    """
    # Candidates: same junction or within ~300m, similar cause
    if "route_path" not in df.columns:
        return {"found": False, "route": None, "message": "No route geometry available in dataset — recommend manual control-room routing."}

    candidates = df[
        df["route_path"].notna() &
        (df["route_path"] != "[]") &
        (df["route_path"] != "")
    ].copy()

    if candidates.empty:
        return {"found": False, "route": None,
                "message": "No historical diversion routes on record for this area — recommend manual control-room routing."}

    # Prefer junction match
    if junction and junction.strip():
        junc_match = candidates[candidates["junction"] == junction]
        if not junc_match.empty:
            row = junc_match.iloc[0]
            return _build_diversion_response(row)

    # Fall back to proximity + cause match
    cause_candidates = candidates[candidates["event_cause"] == cause]
    pool = cause_candidates if not cause_candidates.empty else candidates

    pool = pool.copy()
    pool["dist_m"] = pool.apply(
        lambda r: _haversine(lat, lng, float(r["latitude"]), float(r["longitude"])), axis=1
    )
    nearby = pool[pool["dist_m"] < 300].sort_values("dist_m")
    if nearby.empty:
        nearby = pool.sort_values("dist_m").head(1)

    if nearby.empty:
        return {"found": False, "route": None,
                "message": "No nearby historical diversion routes — recommend manual control-room routing."}

    row = nearby.iloc[0]
    return _build_diversion_response(row)


def _build_diversion_response(row) -> dict:
    import json as _json
    try:
        coords = _json.loads(row["route_path"])
        if coords and len(coords) >= 2:
            date_str = str(row.get("start_datetime", "historical event"))[:10]
            return {
                "found": True,
                "route": [[float(c[0]), float(c[1])] for c in coords],
                "message": f"Historical diversion route from {date_str} at this location — verify before deployment."
            }
    except Exception:
        pass
    return {"found": False, "route": None,
            "message": "Route geometry malformed in historical record — recommend manual control-room routing."}
