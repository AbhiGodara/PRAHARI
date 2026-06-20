from fastapi import APIRouter
from schemas import StationsResponse, AllocatorRequest, AllocatorResponse, AllocationEntry
from data_pipeline import load_processed
from allocator import run_allocation

router = APIRouter(prefix="/allocator")
_df = None


def get_df():
    global _df
    if _df is None:
        _df = load_processed()
    return _df


@router.get("/stations", response_model=StationsResponse)
def stations():
    df = get_df()
    station_list = sorted(df["police_station"].dropna().unique().tolist())
    return StationsResponse(stations=station_list)


@router.post("/run", response_model=AllocatorResponse)
def run(req: AllocatorRequest):
    df = get_df()
    result = run_allocation(
        df,
        police_station=req.police_station,
        window_start=req.window_start,
        window_end=req.window_end,
        officer_pool=req.officer_pool,
    )
    return AllocatorResponse(
        window_start=result["window_start"],
        window_end=result["window_end"],
        allocations=[AllocationEntry(**a) for a in result["allocations"]],
        total_requested=result["total_requested"],
        total_pool=result["total_pool"],
    )
