import json
import numpy as np
import pandas as pd
from config import LOCATION_PRIORS_FILE, EB_SHRINKAGE_K


def build_location_priors(df: pd.DataFrame) -> dict:
    """
    Empirical-Bayes smoothed event rate and severity per grid cell and junction.
    Returns dict with 'grid' and 'junction' keys for lookup.
    """
    global_mean_severity = _severity_mean(df)
    global_mean_duration = df.loc[df["duration_trainable"], "duration_hours"].mean() if df["duration_trainable"].any() else 1.0

    # Grid-cell priors
    grid_priors = {}
    for (gy, gx), grp in df.groupby(["gy", "gx"]):
        n = len(grp)
        high_rate = (grp["priority"] == "High").mean()
        dur_mean = grp.loc[grp["duration_trainable"], "duration_hours"].mean() if grp["duration_trainable"].any() else global_mean_duration
        # Empirical Bayes shrinkage
        severity = (n * high_rate + EB_SHRINKAGE_K * global_mean_severity) / (n + EB_SHRINKAGE_K)
        grid_priors[f"{gy:.4f}_{gx:.4f}"] = {
            "n": int(n),
            "severity": float(severity),
            "mean_duration": float(dur_mean if not np.isnan(dur_mean) else global_mean_duration),
        }

    # Junction priors (more reliable when present)
    junction_priors = {}
    jdf = df[df["junction"].str.strip() != ""]
    for junc, grp in jdf.groupby("junction"):
        n = len(grp)
        high_rate = (grp["priority"] == "High").mean()
        dur_mean = grp.loc[grp["duration_trainable"], "duration_hours"].mean() if grp["duration_trainable"].any() else global_mean_duration
        severity = (n * high_rate + EB_SHRINKAGE_K * global_mean_severity) / (n + EB_SHRINKAGE_K)
        junction_priors[str(junc)] = {
            "n": int(n),
            "severity": float(severity),
            "mean_duration": float(dur_mean if not np.isnan(dur_mean) else global_mean_duration),
        }

    priors = {
        "global_mean_severity": float(global_mean_severity),
        "global_mean_duration": float(global_mean_duration),
        "grid": grid_priors,
        "junction": junction_priors,
    }
    LOCATION_PRIORS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOCATION_PRIORS_FILE, "w") as f:
        json.dump(priors, f)
    print(f"Saved location priors: {len(grid_priors)} grid cells, {len(junction_priors)} junctions")
    return priors


def _severity_mean(df: pd.DataFrame) -> float:
    return float((df["priority"] == "High").mean())


def load_location_priors() -> dict:
    with open(LOCATION_PRIORS_FILE) as f:
        return json.load(f)


def lookup_location_criticality(lat: float, lng: float, junction: str, priors: dict,
                                 grid_res: int = 200) -> float:
    """Return 0-1 location criticality. Junction match preferred over grid cell."""
    if junction and junction.strip() and junction in priors["junction"]:
        return min(1.0, priors["junction"][junction]["severity"])

    gy = round(lat * grid_res) / grid_res
    gx = round(lng * grid_res) / grid_res
    key = f"{gy:.4f}_{gx:.4f}"
    if key in priors["grid"]:
        return min(1.0, priors["grid"][key]["severity"])
    return priors["global_mean_severity"]
