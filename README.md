# PRAHARI — Event-Driven Congestion Intelligence

> **Flipkart GRiD Lock 2.0 · Problem Statement: "Event-Driven Congestion (Planned & Unplanned)"**

Bengaluru's traffic system is **blind** to event impact, **reactive** in deploying officers, and **amnesiac** after incidents close. PRAHARI installs three layers that don't exist today:

| Layer | Before | After |
|-------|--------|-------|
| **PREDICT** | Blind — zero lead-time impact quantification | Event Impact Score (EIS) 0–100 + duration + closure prob in <1s |
| **DEPLOY** | Reactive — officers allocated ad-hoc | Concrete officer count, barricade geometry, diversion lookup |
| **LEARN** | Amnesiac — 71/8,173 events ever reach "resolved" | Post-event debrief feeds the model; every closure sharpens the next prediction |

Built on **8,173 real ASTraM events** from Bengaluru (Nov 2023 – Apr 2024).

---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python scripts/bootstrap.py      # cleans data, builds priors, trains models (~30s)
uvicorn main:app --reload --port 8000
```

> API health check: http://localhost:8000/api/health

### Frontend (separate terminal)

```bash
cd frontend
npm install
cp .env.example .env.local       # edit if backend runs on a different port
npm run dev
```

> App: http://localhost:5173

---

## Deployment

### Backend → Render (free tier)

1. Push this repo to GitHub.
2. Go to [render.com](https://render.com) → New → Web Service → connect your repo.
3. Render will auto-detect `render.yaml` at the root. Click **Deploy**.
4. Once deployed, copy the backend URL (e.g. `https://prahari-backend.onrender.com`).
5. Set the `FRONTEND_ORIGIN` environment variable on Render to your Vercel URL (see below).

> **Cold starts:** Render free tier sleeps after 15 min. Ping `/api/health` a few minutes before any live demo to wake it up.

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → import your GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variable: `VITE_API_BASE_URL` = your Render backend URL.
4. Deploy. Copy the Vercel URL.
5. Go back to Render → Environment → update `FRONTEND_ORIGIN` to the Vercel URL.
6. Trigger a Render redeploy to pick up the new origin.

> These two env vars are circularly dependent — do backend first, frontend second, then one Render env-var update.

---

## Architecture

```
PRAHARI
├── backend/
│   ├── data_pipeline.py      CSV → clean parquet (IST timestamps, cause cleanup, spatial grid)
│   ├── location_priors.py    Empirical-Bayes grid + junction risk priors
│   ├── eis.py                Compose EIS from 5 weighted components
│   ├── deploy_logic.py       Manpower rules, barricade points, diversion lookup
│   ├── allocator.py          Greedy multi-event officer allocation by EIS rank
│   ├── learn.py              Append debriefs → retrain duration model
│   └── routers/              5 FastAPI routers (events, allocator, debrief, learn, insights)
│
└── frontend/src/
    ├── pages/Home.jsx                Landing — three-pillar thesis
    ├── pages/LiveMap.jsx             PREDICT: density heatmap + EIS-coloured active markers
    ├── pages/EventTriage.jsx         PREDICT + DEPLOY: triage form → EIS + recommendations + maps
    ├── pages/ConcurrentAllocator.jsx DEPLOY: officer allocation under resource contention
    ├── pages/PostEventDebrief.jsx    LEARN: debrief form + retrain + before/after MAE chart
    └── pages/Insights.jsx            5 EDA charts — evidence for every design decision
```

## Key Dataset Findings

- **Lead time ≈ 0** for all 8,173 events — no advance impact logging exists today (justifies PREDICT)
- **Top 10% of 500m grid cells hold 44.5%** of all events — location is a learnable prior
- **Duration is cause-dependent**: vehicle_breakdown 0.68h vs road_conditions 133h vs pot_holes 193h
- **Hour-of-day fingerprint**: heavy-vehicle breakdowns peak 00:00–02:00 IST; VIP/events at 10:00–12:00
- **11.5% of (station, hour) slots** have ≥2 concurrent events; one hit 53 (justifies DEPLOY)
- **Manpower recorded in only 1.6% of events** — no systematic deployment exists (justifies LEARN)

## Tech Stack

**Backend:** FastAPI · scikit-learn (HistGradientBoosting) · pandas · SQLite · joblib  
**Frontend:** React · Vite · Tailwind CSS · react-leaflet + leaflet.heat · recharts  
**Deploy:** Render (backend) · Vercel (frontend)
