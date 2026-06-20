import pandas as pd
import numpy as np
from fastapi import APIRouter
from schemas import (
    InsightsSummaryResponse, HourCauseCount, DurationByCause,
    ClosureRateByCause, SpatialConcentration, ConcurrencyDistribution,
)
from data_pipeline import load_processed

router = APIRouter(prefix="/insights")
_df = None


def get_df():
    global _df
    if _df is None:
        _df = load_processed()
    return _df


@router.get("/summary", response_model=InsightsSummaryResponse)
def summary():
    df = get_df()

    # 1. Hour-by-cause counts
    top_causes = df["event_cause"].value_counts().head(10).index.tolist()
    hbc = df[df["event_cause"].isin(top_causes)].groupby(["hour", "event_cause"]).size().reset_index(name="count")
    hour_by_cause = [HourCauseCount(hour=int(r["hour"]), cause=r["event_cause"], count=int(r["count"]))
                     for _, r in hbc.iterrows()]

    # 2. Duration by cause (median, on trainable subset)
    trainable = df[df["duration_trainable"]]
    dur = trainable.groupby("event_cause")["duration_hours"].median().reset_index()
    dur.columns = ["cause", "median_hours"]
    duration_by_cause = [DurationByCause(cause=r["cause"], median_hours=round(float(r["median_hours"]), 2))
                         for _, r in dur.iterrows()]

    # 3. Closure rate by cause
    cr = df.groupby("event_cause")["requires_road_closure"].mean().reset_index()
    cr.columns = ["cause", "rate"]
    closure_rate_by_cause = [ClosureRateByCause(cause=r["cause"], rate=round(float(r["rate"]), 4))
                              for _, r in cr.iterrows()]

    # 4. Spatial concentration curve
    cell_counts = df.groupby(["gy", "gx"]).size().sort_values(ascending=False).reset_index(name="n")
    total_events = cell_counts["n"].sum()
    total_cells = len(cell_counts)
    spatial = []
    cumulative_events = 0
    for i, row in cell_counts.iterrows():
        cumulative_events += row["n"]
        if i % max(1, total_cells // 20) == 0 or i == total_cells - 1:
            spatial.append(SpatialConcentration(
                pct_cells=round((i + 1) / total_cells * 100, 1),
                pct_events=round(cumulative_events / total_events * 100, 1),
            ))

    # 5. Concurrency distribution
    start_col = pd.to_datetime(df["start_datetime"], errors="coerce")
    if start_col.dt.tz is not None:
        start_col = start_col.dt.tz_localize(None)
    df2 = df.copy()
    df2["_h"] = start_col.dt.floor("H")
    conc = df2.groupby(["police_station", "_h"]).size().reset_index(name="concurrent")
    dist = conc["concurrent"].value_counts().sort_index().reset_index()
    dist.columns = ["concurrent_count", "n_slots"]
    concurrency_distribution = [ConcurrencyDistribution(concurrent_count=int(r["concurrent_count"]),
                                                          n_slots=int(r["n_slots"]))
                                 for _, r in dist.iterrows()]

    return InsightsSummaryResponse(
        hour_by_cause=hour_by_cause,
        duration_by_cause=duration_by_cause,
        closure_rate_by_cause=closure_rate_by_cause,
        spatial_concentration=spatial,
        concurrency_distribution=concurrency_distribution,
    )
