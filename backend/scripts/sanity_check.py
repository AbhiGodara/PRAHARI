import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from eis import score_event

examples = [
    {"latitude": 13.006, "longitude": 77.597, "event_cause": "vip_movement", "event_type": "planned", "requires_road_closure": True, "corridor": "Bellary Road 1", "junction": "MekhriCircle", "police_station": "Sadashivanagar", "veh_type": "unknown", "hour": 11, "dow": 1},
    {"latitude": 13.040, "longitude": 77.518, "event_cause": "vehicle_breakdown", "event_type": "unplanned", "requires_road_closure": False, "corridor": "Tumkur Road", "junction": "", "police_station": "Peenya", "veh_type": "heavy_vehicle", "hour": 1, "dow": 2},
    {"latitude": 12.922, "longitude": 77.645, "event_cause": "pot_holes", "event_type": "unplanned", "requires_road_closure": False, "corridor": "Non-corridor", "junction": "", "police_station": "HSR Layout", "veh_type": "unknown", "hour": 14, "dow": 3},
    {"latitude": 12.956, "longitude": 77.586, "event_cause": "public_event", "event_type": "planned", "requires_road_closure": True, "corridor": "Non-corridor", "junction": "", "police_station": "Wilson Garden", "veh_type": "unknown", "hour": 10, "dow": 6},
    {"latitude": 12.965, "longitude": 77.590, "event_cause": "construction", "event_type": "planned", "requires_road_closure": True, "corridor": "Hosur Road", "junction": "SilkBoardJunc", "police_station": "HSR Layout", "veh_type": "unknown", "hour": 8, "dow": 0},
]
for ex in examples:
    result = score_event(ex)
    loc = ex.get("junction") or ex["police_station"]
    print(f"  {ex['event_cause']:<20} @ {loc:<20} -> EIS {result['eis']:5.1f}  (dur={result['predicted_duration_hours']:.1f}h, closure={result['closure_probability']:.2f})")
