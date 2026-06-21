from pydantic import BaseModel
from typing import Optional, List


# --- Health ---

class HealthResponse(BaseModel):
    status: str


# --- Events ---

class ActiveEvent(BaseModel):
    event_id: str
    latitude: float
    longitude: float
    event_cause: str
    police_station: str
    eis: float
    priority: str
    requires_road_closure: bool
    start_datetime: str


class ActiveEventsResponse(BaseModel):
    events: List[ActiveEvent]


class HeatmapResponse(BaseModel):
    points: List[List[float]]  # [[lat, lng, weight], ...]


class TriageRequest(BaseModel):
    latitude: float
    longitude: float
    event_cause: str
    event_type: str  # "planned" | "unplanned"
    requires_road_closure: bool
    corridor: Optional[str] = None
    junction: Optional[str] = None
    police_station: Optional[str] = None
    veh_type: Optional[str] = None
    hour: Optional[int] = None
    dow: Optional[int] = None


class EISComponents(BaseModel):
    duration_score: float
    closure_score: float
    location_score: float
    concurrency_score: float
    cause_severity_score: float


class ManpowerRecommendation(BaseModel):
    count: int
    rationale: str


class BarricadePoint(BaseModel):
    lat: float
    lng: float
    label: str


class DiversionRecommendation(BaseModel):
    found: bool
    route: Optional[List[List[float]]] = None  # [[lat, lng], ...]
    message: str


class TriageResponse(BaseModel):
    event_id: str
    eis: float
    predicted_duration_hours: float
    closure_probability: float
    components: EISComponents
    manpower: ManpowerRecommendation
    barricade_points: List[BarricadePoint]
    diversion: DiversionRecommendation


# --- Allocator ---

class StationsResponse(BaseModel):
    stations: List[str]


class AllocatorRequest(BaseModel):
    police_station: str
    window_start: Optional[str] = None  # ISO datetime
    window_end: Optional[str] = None
    officer_pool: int = 20


class AllocationEntry(BaseModel):
    event_id: str
    event_cause: str
    eis: float
    requested_officers: int
    allocated_officers: int
    covered: bool


class AllocatorResponse(BaseModel):
    window_start: str
    window_end: str
    allocations: List[AllocationEntry]
    total_requested: int
    total_pool: int


# --- Debrief ---

class PendingDebriefEvent(BaseModel):
    event_id: str
    event_cause: str
    predicted_duration_hours: float
    eis: float
    triaged_at: str  # ISO


class PendingDebriefResponse(BaseModel):
    events: List[PendingDebriefEvent]


class DebriefRequest(BaseModel):
    event_id: str
    actual_duration_hours: float
    officers_used: int
    diversion_used: bool
    accuracy_rating: int  # 1–5
    notes: Optional[str] = None


class DebriefResponse(BaseModel):
    saved: bool


# --- Learn ---

class RetrainResponse(BaseModel):
    before_mae_hours: float
    after_mae_hours: float
    n_debriefs_used: int
    retrained_at: str  # ISO


# --- Insights ---

class HourCauseCount(BaseModel):
    hour: int
    cause: str
    count: int


class DurationByCause(BaseModel):
    cause: str
    median_hours: float


class ClosureRateByCause(BaseModel):
    cause: str
    rate: float


class SpatialConcentration(BaseModel):
    pct_cells: float
    pct_events: float


class ConcurrencyDistribution(BaseModel):
    concurrent_count: int
    n_slots: int


class InsightsSummaryResponse(BaseModel):
    hour_by_cause: List[HourCauseCount]
    duration_by_cause: List[DurationByCause]
    closure_rate_by_cause: List[ClosureRateByCause]
    spatial_concentration: List[SpatialConcentration]
    concurrency_distribution: List[ConcurrencyDistribution]
