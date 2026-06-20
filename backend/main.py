from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import FRONTEND_ORIGIN
from db import init_db
from routers import events, allocator, debrief, learn, insights

app = FastAPI(title="PRAHARI", description="Event-Driven Congestion Intelligence for Bengaluru")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
