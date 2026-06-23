from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import FRONTEND_ORIGINS
from db import init_db
from routers import events, allocator, debrief, learn, insights

app = FastAPI(title="PRAHARI", description="Event-Driven Congestion Intelligence for Bengaluru")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api")
app.include_router(allocator.router, prefix="/api")
app.include_router(debrief.router, prefix="/api")
app.include_router(learn.router, prefix="/api")
app.include_router(insights.router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()
    # Pre-warm: load parquet + ML models at startup so first request is instant
    from routers.events import get_df, active_events
    from eis import _load_models
    get_df()
    _load_models()
    # Pre-compute and cache active events so Live Map loads instantly
    active_events(cause=None, zone=None)  # populates _active_events_cache_bytes


@app.get("/api/health")
def health():
    return {"status": "ok"}
