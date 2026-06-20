"""
One-command bootstrap: clean data → build priors → train models.
Run from the project root: python backend/scripts/bootstrap.py
Or from backend/: python scripts/bootstrap.py
"""
import sys
from pathlib import Path

# Ensure backend/ is on the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from data_pipeline import load_and_clean, save_processed
from location_priors import build_location_priors, load_location_priors
from models.train_duration_model import train as train_duration
from models.train_closure_model import train as train_closure
from eis import score_event

print("=" * 60)
print("PRAHARI Bootstrap")
print("=" * 60)

print("\n[1/4] Loading and cleaning data...")
df = load_and_clean()
save_processed(df)

print("\n[2/4] Building location priors...")
build_location_priors(df)
priors = load_location_priors()

print("\n[3/4] Training duration model (multiple configs, temporal split)...")
train_duration(df, priors)

print("\n[4/4] Training closure model (multiple configs, temporal split)...")
train_closure(df, priors)

print("\n[Sanity check] Scoring 5 example events...")
examples = [
    {"latitude": 13.006, "longitude": 77.597, "event_cause": "vip_movement",
     "event_type": "planned", "requires_road_closure": True,
     "corridor": "Bellary Road 1", "junction": "MekhriCircle",
     "police_station": "Sadashivanagar", "veh_type": "unknown", "hour": 11, "dow": 1},
    {"latitude": 13.040, "longitude": 77.518, "event_cause": "vehicle_breakdown",
     "event_type": "unplanned", "requires_road_closure": False,
     "corridor": "Tumkur Road", "junction": "",
     "police_station": "Peenya", "veh_type": "heavy_vehicle", "hour": 1, "dow": 2},
    {"latitude": 12.922, "longitude": 77.645, "event_cause": "pot_holes",
     "event_type": "unplanned", "requires_road_closure": False,
     "corridor": "Non-corridor", "junction": "",
     "police_station": "HSR Layout", "veh_type": "unknown", "hour": 14, "dow": 3},
    {"latitude": 12.956, "longitude": 77.586, "event_cause": "public_event",
     "event_type": "planned", "requires_road_closure": True,
     "corridor": "Non-corridor", "junction": "",
     "police_station": "Wilson Garden", "veh_type": "unknown", "hour": 10, "dow": 6},
    {"latitude": 12.965, "longitude": 77.590, "event_cause": "construction",
     "event_type": "planned", "requires_road_closure": True,
     "corridor": "Hosur Road", "junction": "SilkBoardJunc",
     "police_station": "HSR Layout", "veh_type": "unknown", "hour": 8, "dow": 0},
]

for ex in examples:
    result = score_event(ex)
    print(f"  {ex['event_cause']:20s} @ {ex.get('junction') or ex['police_station']:20s} -> EIS {result['eis']:5.1f}  "
          f"(dur={result['predicted_duration_hours']:.1f}h, closure={result['closure_probability']:.2f})")

print("\nBootstrap complete. Run:")
print("  cd backend && uvicorn main:app --reload --port 8000")
