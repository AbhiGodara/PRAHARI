# PRAHARI — Event-Driven Congestion Intelligence for Bengaluru
## Build spec for Claude Code — Flipkart GRiD Lock 2.0, Problem Statement: "Event-Driven Congestion (Planned & Unplanned)"

You are building a **working, deployable full-stack application**: FastAPI backend (data, ML, business logic, REST API) + React frontend (the UI a judge actually clicks through), from a real ASTraM traffic-event dataset for Bengaluru. This file is the complete spec. Work through the phases in order. Each phase has a "Definition of Done" — do not move to the next phase until it's met. Prefer a thin, fully-working slice over a deep, half-built one: the golden path (Phase 0 → Phase 4) must run end-to-end, backend and frontend talking to each other, before you touch any stretch goal in Phase 6.

**Time pressure is real.** If a choice in this document conflicts with shipping a working deployed demo, ship the simpler version and leave a `# TODO(stretch):` / `// TODO(stretch):` comment. Do not silently swap in a different architecture — note the deviation in the final summary instead.

**The single biggest risk in a FastAPI+React split is contract drift** — the frontend guessing at a shape the backend doesn't actually return. Section 4 (API contract) is the source of truth. Write the Pydantic schemas first, implement each backend endpoint to match exactly, and write the frontend API client against that exact contract. Do not let the two sides diverge.

---

## 0. What this app does (read this before writing any code)

The dataset shows Bengaluru's traffic system is **blind** (events are logged with ~zero lead time — no advance impact quantification, even for "planned" events), **reactive** (manpower deployment is recorded for only 1.6% of events — no systematic assignment), and **amnesiac** (only 71 of 8,173 events ever reach a structured "resolved" state — nothing is learned after the fact). The app installs three layers that don't exist today:

1. **PREDICT** — given an event (real-time or forward-calendar), output an Event Impact Score (EIS, 0–100), expected duration, and closure probability, in under a second.
2. **DEPLOY** — turn that forecast into a concrete recommendation: officer count, barricade points, and a diversion suggestion. When multiple events compete for the same station's limited officers, allocate by impact, not by whoever called first.
3. **LEARN** — capture what actually happened after an event closes (a debrief), store it, and periodically retrain so forecast accuracy visibly improves. This is the differentiator — build it for real, not as a stub screen.

Every screen in the frontend should make one of these three words obvious to a judge within 5 seconds of looking at it.

---

## 1. Dataset — schema reference (do not re-derive this, it's already known)

The CSV will be at the project root or `data/raw/` (glob for `*.csv` there — it's a long anonymized name like `Astram_event_data_anonymized_*.csv`). ~8,173 rows, 46 columns. Confirmed facts about this specific file:

```
Coverage: 2023-11-09 to 2024-04-08 (~5 months). Timestamps are UTC — MUST convert to
          Asia/Kolkata (+05:30) before any hour-of-day / day-of-week feature work.
Geography: Bengaluru. lat 12.80–13.27, lng 77.31–77.77.

Fully populated (100%): id, event_type, latitude, longitude, event_cause, address,
  authenticated, status, requires_road_closure, start_datetime, created_date,
  last_modified_by_id, priority, modified_datetime, client_id, created_by_id,
  police_station

Near-complete, useful: corridor (99.8%), endlatitude/endlongitude (97.9%),
  kgid (96.8%), description (83.4% — free text, code-mixed Kannada+English),
  veh_type (59.8%), zone (42.1%), gba_identifier (42.1%), closed_by_id /
  closed_datetime (38.4%), junction (30.7%)

Sparse but valuable, use conditionally: end_address (8.4%), end_datetime (6.0%),
  age_of_truck / reason_breakdown / cargo_material (3.4%, all populated together —
  only for event_cause == 'vehicle_breakdown'), route_path (1.7% — JSON-stringified
  list of [lat,lng] polyline points; '[]' means empty, real lists exist),
  citizen_accident_id / assigned_to_police_id (1.6%), resolved_at_* / resolved_by_id /
  resolved_datetime (0.9%), direction (0.5%)

ALWAYS-NULL — drop immediately: map_file, meta_data, comment (0% populated)

event_type: unplanned (7,706) / planned (467)
event_cause (17 values, collapse near-dupes 'Debris'/'debris' and
  'Fog / Low Visibility' into existing categories during cleaning):
  vehicle_breakdown (4,896), others (638), pot_holes (537), construction (480),
  water_logging (458), accident (365), tree_fall (284), road_conditions (170),
  congestion (136), public_event (84), procession (72), vip_movement (20),
  protest (15), debris (13), test_demo (3, drop these as noise),
  fog_low_visibility (2)
status: closed (7,095) / active (1,007) / resolved (71)
priority: High (5,030) / Low (3,141) / null (2, drop)
requires_road_closure: bool, True=676, False=7,497
corridor: 22 values incl. 'Non-corridor' (3,124) — real arterials: Mysore Road,
  Bellary Road 1/2, Tumkur Road, Hosur Road, ORR North/East/West 1/2, Old Madras
  Road, Magadi Road, Bannerghata Road, West of Chord Road, Airport roads
zone: 10 values (Central/North/South/East/West Zone 1/2) — 58% null, do not
  rely on this as a primary key for anything
police_station: 54 values
junction: 294 values, 69% null — when present, real named chokepoints
  (MekhriCircle 64, AyyappaTempleJunc 49, SatteliteBusStandJunc 43,
  YeshwanthpuraCircle 38, SilkBoardJunc 33, etc.)
veh_type: bmtc_bus, heavy_vehicle, lcv, others, private_bus, private_car,
  truck, ksrtc_bus, taxi, auto — 40% null (mostly null for non-breakdown causes)

KEY FINDINGS (already validated — build features that exploit these, don't
re-discover them from scratch):
- Lead time (start - created) ≈ 0 for both planned and unplanned events.
  No advance logging happens today. This justifies the whole PREDICT stage.
- Spatial concentration: top 10% of ~500m grid cells hold 44.5% of all events;
  top 20% hold 64%. Location is a very strong, very learnable prior.
- Duration is heavily cause-dependent (median hours, on the closed subset):
  vehicle_breakdown 0.68, accident 0.67, procession 0.61, congestion 1.19,
  tree_fall 12.2, construction 48.3, water_logging 61.5, road_conditions 133,
  pot_holes 193. Models MUST use event_cause as a feature, not ignore it.
- Closure probability is cause-dependent too: vip_movement 0.80, public_event
  0.46, protest 0.40, procession 0.26, construction 0.26, tree_fall 0.39 vs.
  vehicle_breakdown 0.04, accident 0.03.
- Hour-of-day (IST) fingerprints differ sharply by cause: heavy-vehicle
  breakdowns peak 00:00–02:00 (night goods-movement window); processions /
  public events / VIP movement peak ~10:00–12:00 (daytime). This is a real,
  citable pattern — use hour + cause as a joint feature.
- 11.5% of (police_station, hour) slots have ≥2 concurrent active events;
  one slot hit 53 concurrent. This is what the allocator (Phase 3) must handle.
- closed_datetime is present for only 38.4% of rows; ~12% of all rows are
  still 'active' (no end observed). This is right-censoring — see Phase 1
  for how to handle it without silently dropping 62% of the data's signal.
```

---

## 2. Tech stack (locked — do not substitute without a strong reason, and say so if you do)

**Backend**
- **Framework:** FastAPI + Uvicorn.
- **ML:** scikit-learn only for the core path (`HistGradientBoostingRegressor`,
  `HistGradientBoostingClassifier`) — no compiled-binary dependencies
  (lightgbm/xgboost), to keep cloud deployment friction near zero. `lifelines`
  is permitted ONLY as a Phase 6 stretch for survival analysis — keep it
  optional, behind a flag, so its absence never breaks the core API.
- **Data:** pandas, numpy.
- **Persistence:** SQLite via SQLAlchemy (or stdlib `sqlite3` if you prefer —
  your call, but keep it to one file, no external DB server).
- **Model storage:** `joblib` pickles in `backend/models_store/`.
- **Validation:** Pydantic v2 models for every request/response (Section 4 is
  the contract — implement it exactly).
- **CORS:** `fastapi.middleware.cors.CORSMiddleware`, allowed origins read
  from an env var (`FRONTEND_ORIGIN`), defaulting to
  `http://localhost:5173` for local dev.
- Do NOT use `osmnx` or any live OpenStreetMap graph download in the core
  path — it's slow on first run and fragile in a cloud sandbox with no
  guaranteed internet access at demo time. Diversion logic uses historical
  `route_path` data instead (see Phase 3).

**Frontend**
- **Framework:** React + Vite. Plain **JavaScript, not TypeScript** — fewer
  build failures under time pressure, this is a hackathon demo not a
  production codebase. (If Claude Code strongly prefers TS, that's fine, but
  don't let type-fighting eat the time budget — JS is the default here.)
- **Styling:** Tailwind CSS (utility-first, fast to get a deliberate dark
  civic-alert look — amber/orange accent on dark background — instead of a
  generic default-React look).
- **Map:** `react-leaflet` + `leaflet` + `leaflet.heat` (for the historical
  density heatmap layer). Remember to import Leaflet's CSS.
- **Charts:** `recharts`.
- **HTTP:** native `fetch`, wrapped in a small `src/api/client.js` — no need
  for axios for this scope.
- **State:** plain React hooks (`useState`/`useEffect`) — no Redux/Zustand,
  the app doesn't need it.
- **Routing:** `react-router-dom` for the 5 pages + home.

---

## 3. Repository structure to create

```
prahari/
├── CLAUDE.md                          (this file — leave at root, do not move)
├── README.md                          (what it is, how to run both halves, how to deploy)
├── data/
│   └── raw/                           (the user's CSV — or glob the repo root for it)
├── backend/
│   ├── requirements.txt
│   ├── main.py                        (FastAPI app, CORS, router mounting)
│   ├── config.py                      (paths, EIS weights, officer-pool defaults)
│   ├── schemas.py                     (ALL Pydantic request/response models — Section 4)
│   ├── data_pipeline.py               (load → clean → tz-convert → feature engineer → cache)
│   ├── location_priors.py             (empirical-Bayes grid + junction risk priors)
│   ├── models/
│   │   ├── train_duration_model.py
│   │   ├── train_closure_model.py
│   │   └── model_utils.py             (shared featurization, temporal split helper)
│   ├── eis.py                         (compose the Event Impact Score from components)
│   ├── deploy_logic.py                (manpower rules, barricade points, diversion lookup)
│   ├── allocator.py                   (greedy multi-event officer allocation)
│   ├── db.py                          (SQLite schema + session helpers)
│   ├── learn.py                       (retrain job + before/after calibration metrics)
│   ├── routers/
│   │   ├── events.py                  (/api/events/*)
│   │   ├── allocator.py               (/api/allocator/*)
│   │   ├── debrief.py                 (/api/debrief/*)
│   │   ├── learn.py                   (/api/learn/*)
│   │   └── insights.py                (/api/insights/*)
│   ├── models_store/                  (joblib pickles + metrics JSON, commit these)
│   ├── data/processed/                (cached parquet, commit this — see Phase 5)
│   └── scripts/
│       └── bootstrap.py               (one command: clean data → build priors → train models)
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    ├── .env.example                   (VITE_API_BASE_URL=http://localhost:8000)
    └── src/
        ├── main.jsx
        ├── App.jsx                    (router setup, nav layout)
        ├── api/
        │   └── client.js              (fetch wrapper, base URL from import.meta.env)
        ├── components/
        │   ├── NavBar.jsx
        │   ├── EISGauge.jsx           (the big 0-100 score widget)
        │   ├── ComponentBreakdown.jsx (bar chart of EIS sub-components)
        │   ├── MapView.jsx            (shared leaflet map wrapper)
        │   └── RecommendationCard.jsx (manpower / barricade / diversion display)
        ├── pages/
        │   ├── Home.jsx
        │   ├── LiveMap.jsx
        │   ├── EventTriage.jsx
        │   ├── ConcurrentAllocator.jsx
        │   ├── PostEventDebrief.jsx
        │   └── Insights.jsx
        └── styles/
            └── index.css              (Tailwind directives + small custom theme)
```

---

## 4. API contract (write `backend/schemas.py` from this section first, then implement)

All responses are JSON. All endpoints prefixed `/api`. Use Pydantic models named to match.

```
GET  /api/health
  → { "status": "ok" }

GET  /api/events/active?cause=&zone=
  → { "events": [ { "event_id": str, "latitude": float, "longitude": float,
       "event_cause": str, "police_station": str, "eis": float,
       "priority": str, "requires_road_closure": bool,
       "start_datetime": str (ISO) } ] }
  (pulls historical rows with status == 'active' from the cleaned dataset —
   this is the "simulated live feed" framing, label it as such in the UI)

GET  /api/events/heatmap
  → { "points": [ [lat, lng, weight], ... ] }
  (weight = normalized historical event density per grid cell, for leaflet.heat)

POST /api/events/triage
  body: { "latitude": float, "longitude": float, "event_cause": str,
          "event_type": "planned"|"unplanned", "requires_road_closure": bool,
          "corridor": str|null, "junction": str|null,
          "police_station": str|null, "veh_type": str|null,
          "hour": int|null, "dow": int|null }
  → { "event_id": str (generated, store this prediction in DB),
      "eis": float, "predicted_duration_hours": float,
      "closure_probability": float,
      "components": { "duration_score": float, "closure_score": float,
                       "location_score": float, "concurrency_score": float,
                       "cause_severity_score": float },
      "manpower": { "count": int, "rationale": str },
      "barricade_points": [ { "lat": float, "lng": float, "label": str } ],
      "diversion": { "found": bool, "route": [[lat,lng], ...] | null,
                      "message": str } }
  (this single combined endpoint backs the Event Triage page — predict AND
   recommend in one call, and log the prediction to SQLite for later debrief)

GET  /api/allocator/stations
  → { "stations": [str, ...] }

POST /api/allocator/run
  body: { "police_station": str, "window_start": str (ISO)|null,
          "window_end": str (ISO)|null, "officer_pool": int }
  (if window is null, auto-select the busiest historical hour for that
   station — useful for a one-click "stress test" demo button)
  → { "window_start": str, "window_end": str,
      "allocations": [ { "event_id": str, "event_cause": str, "eis": float,
        "requested_officers": int, "allocated_officers": int,
        "covered": bool } ],
      "total_requested": int, "total_pool": int }

GET  /api/debrief/pending
  → { "events": [ { "event_id": str, "event_cause": str,
        "predicted_duration_hours": float, "eis": float,
        "triaged_at": str (ISO) } ] }
  (events logged via /api/events/triage that don't yet have a debrief)

POST /api/debrief
  body: { "event_id": str, "actual_duration_hours": float,
          "officers_used": int, "diversion_used": bool,
          "accuracy_rating": int (1-5), "notes": str|null }
  → { "saved": true }

POST /api/learn/retrain
  → { "before_mae_hours": float, "after_mae_hours": float,
      "n_debriefs_used": int, "retrained_at": str (ISO) }
  (appends debrief outcomes to the duration-model training set, retrains,
   evaluates on the same held-out temporal test split, returns both numbers
   so the frontend can show a real before/after)

GET  /api/insights/summary
  → { "hour_by_cause": [ { "hour": int, "cause": str, "count": int } ],
      "duration_by_cause": [ { "cause": str, "median_hours": float } ],
      "closure_rate_by_cause": [ { "cause": str, "rate": float } ],
      "spatial_concentration": [ { "pct_cells": float, "pct_events": float } ],
      "concurrency_distribution": [ { "concurrent_count": int, "n_slots": int } ] }
  (backs the Insights page — all 5 EDA charts in one response)
```

**Definition of Done for this section:** `backend/schemas.py` contains a Pydantic model for every request/response shape above before any router is implemented.

---

## 5. Phase 0 — Project setup

1. Create the structure in Section 3.
2. `backend/requirements.txt`:
   ```
   fastapi
   uvicorn[standard]
   pandas
   numpy
   scikit-learn
   joblib
   pydantic
   sqlalchemy
   python-dotenv
   ```
3. Locate the CSV (glob `*.csv` at repo root and in `data/raw/`). Load with `pd.read_csv(path, low_memory=False)`. Print shape and column list to confirm it matches Section 1 — if columns differ meaningfully, stop and flag it rather than guessing.
4. `frontend`: scaffold with `npm create vite@latest frontend -- --template react`, add Tailwind, `react-router-dom`, `react-leaflet`, `leaflet`, `leaflet.heat`, `recharts`.
5. `backend/main.py`: FastAPI app, CORS middleware wired to `FRONTEND_ORIGIN` env var, mount all 5 routers under `/api`, a root `/api/health`.

**Definition of Done:** `uvicorn backend.main:app --reload` serves `/api/health` returning `{"status":"ok"}`. `npm run dev` in `frontend/` launches a blank-but-branded landing page with working nav to all 5 pages (pages can be stubs that just render a title at this point). The frontend successfully fetches `/api/health` and displays the status somewhere visible (proves CORS + wiring work before any real feature is built).

---

## 6. Phase 1 — Data pipeline (`backend/data_pipeline.py`)

1. Drop `map_file`, `meta_data`, `comment` (always null).
2. Parse `start_datetime`, `created_date`, `modified_datetime`, `closed_datetime`, `resolved_datetime` as UTC, then convert to `Asia/Kolkata`. Derive `hour`, `dow` (0=Mon), `is_weekend`, `month`.
3. Clean `event_cause`: lowercase, strip, merge `'Debris'/'debris'` → `debris`, merge the fog variant → `fog_low_visibility`, drop the 3 `test_demo` rows as noise.
4. Build `duration_hours = (closed_datetime - start_datetime).total_seconds()/3600` where `closed_datetime` is present. Filter to `0 <= duration_hours <= 720` (30 days) as the trainable subset — note in a comment that this is right-censored data (only the 38.4% with a closed timestamp); rows without `closed_datetime` are NOT dropped from the dataset overall, only excluded from the *duration regression training set*. They still appear via `/api/events/active` as currently-active events.
5. Build a `gy, gx` ~500m grid (`round(lat*200)/200`, same for lng) for the spatial prior in Phase 2.
6. Build `is_currently_active = (status == 'active')` flag — used by `/api/events/active` and the allocator, using the dataset's own timestamps as a stand-in for live data (state this framing explicitly in the frontend copy: "Simulated live feed using historical timestamps" — judges respect honesty about a static dataset standing in for a live API).
7. Cache the cleaned frame to `backend/data/processed/events_clean.parquet`. All downstream code reads from here, not the raw CSV.

**Definition of Done:** `python backend/scripts/bootstrap.py` (or the relevant step within it) prints row counts before/after cleaning, the IST hour-of-day distribution (should show the night peak around 1–2 AM for vehicle_breakdown — sanity check against Section 1), and writes the parquet file.

---

## 7. Phase 2 — PREDICT: the Event Impact Score

### 7.1 Location prior (`backend/location_priors.py`)
For each `(gy, gx)` grid cell, compute an empirical-Bayes-smoothed event rate and average severity (use `priority == 'High'` rate and mean `duration_hours` where available) shrunk toward the global mean using cell sample size as the shrinkage weight (e.g. `(n_cell * cell_mean + k * global_mean) / (n_cell + k)` with `k≈10`). Also build the same prior keyed by `junction` name where present (more reliable than grid cell when available — prefer junction match, fall back to grid cell). Save as `backend/models_store/location_priors.json`.

### 7.2 Duration model (`backend/models/train_duration_model.py`)
- **Target:** `log1p(duration_hours)` on the trainable subset from Phase 1.
- **Features:** `event_cause`, `hour`, `dow`, `is_weekend`, `corridor`, `requires_road_closure`, `veh_type` (fill missing with `'unknown'`), `priority`. One-hot or ordinal-encode categoricals (use `sklearn.compose.ColumnTransformer` + `OneHotEncoder(handle_unknown='ignore')`).
- **Model:** `HistGradientBoostingRegressor`.
- **Split:** TEMPORAL, not random — train on events with `start_datetime < 2024-03-01`, test on `>= 2024-03-01`. State this in code comments; it's the defensible choice for a system meant to predict the future.
- **Eval:** report MAE and RMSE in the original (un-logged) hours scale; save to `backend/models_store/duration_model_metrics.json` (read by `/api/insights/summary` and by `/api/learn/retrain`'s before/after comparison).
- Save model to `backend/models_store/duration_model.joblib`.

### 7.3 Closure model (`backend/models/train_closure_model.py`)
- **Target:** `requires_road_closure` (fully populated, no censoring issue).
- **Features:** same as above.
- **Model:** `HistGradientBoostingClassifier`, same temporal split.
- **Eval:** ROC-AUC and a calibration check (predicted probability vs actual rate in bins) — save metrics JSON.
- Save to `backend/models_store/closure_model.joblib`.

### 7.4 Compose EIS (`backend/eis.py`)
```python
EIS = 100 * (
    0.30 * norm(predicted_duration_hours, cap=168)   # cap at 1 week for normalization
  + 0.25 * predicted_closure_probability
  + 0.25 * location_criticality                       # from priors, 0-1
  + 0.15 * concurrency_pressure                        # active events in same
                                                          # police_station right now, 0-1 capped
  + 0.05 * cause_severity_prior                         # historical mean severity for this cause
)
```
Weights live in `backend/config.py` as named constants, not magic numbers, so the Learn phase can adjust them. Write `score_event(event_dict) -> dict` returning the full `components` breakdown — this is what `/api/events/triage` calls and what the frontend's `ComponentBreakdown.jsx` visualizes. Explainability (showing *why* the score is what it is) is a judge-facing win, not an afterthought.

**Definition of Done:** running `backend/scripts/bootstrap.py` trains both models, builds priors, and `score_event(...)` on a sample input returns a sane 0–100 score with all sub-components populated. Print 5 example scores across different causes to sanity-check the ranking makes sense (a VIP movement at a known hotspot junction should clearly outscore a low-priority pothole).

---

## 8. Phase 3 — DEPLOY: prescriptive recommendations

### 8.1 Manpower (`backend/deploy_logic.py :: recommend_manpower`)
Rule-based on EIS band, modulated by cause (manpower ground truth doesn't exist in the data — 1.6% coverage — so be transparent that this is a starting heuristic the Learn loop refines):
```
EIS 80-100  → 6-8 officers (+ traffic warden support if requires_road_closure)
EIS 50-79   → 3-5 officers
EIS 20-49   → 1-2 officers
EIS  0-19   → monitor only (0-1 officer)
```
Override: `vip_movement` always gets at least the 50-79 tier regardless of computed EIS (matches the 80% closure-rate reality). Return both the number and a one-line rationale string — this fills `manpower.rationale` in the `/api/events/triage` response.

### 8.2 Barricade points
If `route_path` exists for this event (or for a similar historical event at the same `junction`/`corridor`), use its first and last coordinate as barricade points. If not, use the event's own `(lat, lng)` plus a note: "Recommend barricading both directions at [junction/corridor name] — no precise geometry on record." Return a list matching the `barricade_points` schema in Section 4.

### 8.3 Diversion (`backend/deploy_logic.py :: recommend_diversion`)
Nearest-neighbor lookup: from the events table, find historical events with non-empty `route_path` at the same `junction` (or within ~300m via haversine if no junction match) and the same or a related `event_cause`. If found, return it as `diversion.route` with `found: true` and a message naming the date it was historically used. If none found, return `found: false`, `route: null`, and a clear fallback message naming the nearest alternate named corridor (if derivable) and recommending manual control-room routing — do NOT fabricate a route. Being honest about this gap is a deliberate, stated design choice — keep it that way in the frontend copy too.

### 8.4 Allocator (`backend/allocator.py`)
Greedy allocation: given a list of concurrently active events (same `police_station`, overlapping time window) and a configurable officer pool, sort events by EIS descending, assign each its recommended manpower (Section 8.1) until the pool is exhausted; events beyond the pool get `covered: false` with the allocation shortfall visible in the response. This backs `/api/allocator/run` exactly as specified in Section 4.

**Definition of Done:** given a hand-picked set of 3-4 historical events sharing a station/hour, the allocator produces a sensible, explainable ranking and a clear "ran out of officers here" cutoff via the API.

---

## 9. Phase 4 — Backend routers + React frontend (the golden path — this is what gets demoed)

### 9.1 Backend: implement the 5 routers exactly against Section 4
`routers/events.py`, `routers/allocator.py`, `routers/debrief.py`, `routers/learn.py`, `routers/insights.py`. Each is thin — it should mostly call into `eis.py` / `deploy_logic.py` / `allocator.py` / `learn.py` and shape the response per the Pydantic schemas. Log every `/api/events/triage` call into the SQLite `predictions` table (event_id, inputs, outputs, timestamp) — this is what `/api/debrief/pending` and the learn loop read from.

### 9.2 Frontend: `pages/Home.jsx`
PRAHARI branding, one-paragraph mission statement, and the three-word thesis (blind → seeing, reactive → prescriptive, amnesiac → learning) as the hero copy. Nav to the 5 pages.

### 9.3 `pages/LiveMap.jsx` — PREDICT, visualized
`MapView` centered on Bengaluru, fed by `GET /api/events/heatmap` (density layer via `leaflet.heat`) and `GET /api/events/active` (markers colored/sized by `eis`). Sidebar filters by cause/zone re-fetch `active` with query params. This page should make "44.5% of events happen in 10% of the city" visually obvious within 2 seconds.

### 9.4 `pages/EventTriage.jsx` — PREDICT + DEPLOY, the core demo screen
A form: pick a location (map click on a `MapView` instance returning lat/lng, or manual entry + corridor/junction dropdowns), event_cause, planned vs unplanned, requires_closure toggle, hour/day. On submit, POST to `/api/events/triage`. Render: `EISGauge` (the big 0–100 number), `ComponentBreakdown` (bar chart of the 5 sub-components), predicted duration and closure probability, then `RecommendationCard`s for manpower (with rationale text), barricade points (small map with markers), and diversion (route on map if found, otherwise the honest fallback message).

### 9.5 `pages/ConcurrentAllocator.jsx` — DEPLOY under contention
Dropdown of stations (`GET /api/allocator/stations`), a time-window picker (or a one-click "load the busiest historical slot" button — auto-select via the null-window behavior described in Section 4), an officer-pool slider, a "Run Allocation" button that POSTs to `/api/allocator/run` and renders a table/list of events with requested vs allocated officers and a clear visual cutoff for `covered: false` events. This page exists specifically to make Finding #4 (resource contention) tangible — don't skip it for time.

### 9.6 `pages/PostEventDebrief.jsx` — LEARN, the differentiator
A dropdown of pending triaged events (`GET /api/debrief/pending`), a form for actual duration, officers used, diversion used, 1–5 accuracy rating, notes — POSTs to `/api/debrief`. A prominent **"Retrain on accumulated debriefs"** button calls `POST /api/learn/retrain` and renders the returned `before_mae_hours` vs `after_mae_hours` as a `recharts` bar comparison. This before/after chart is the single most important visual in the whole app for the pitch — make sure it actually works and actually shows a number changing, even if the change is small with limited debrief data.

### 9.7 `pages/Insights.jsx` — the EDA, presented as evidence
One call to `GET /api/insights/summary`, rendered as 5 `recharts` charts: hour-of-day-by-cause (the night-peak vs daytime-peak contrast), duration-by-cause (log-scale bar), closure-rate-by-cause, the spatial-concentration curve (% of events vs % of top cells), and the concurrent-events-per-station-hour distribution. This page doubles as your pitch slides — make it presentable, not just functional.

**Definition of Done:** with both `uvicorn` and `npm run dev` running locally, a judge can click through all 5 pages, trigger a real prediction on Event Triage, see it reflected in a real allocation on Concurrent Allocator, close it out on Post-Event Debrief and watch a real metric change, and see the underlying evidence on Insights — with zero crashes, using only the bundled dataset and no external API keys.

---

## 10. Phase 5 — Polish & deploy (two services)

1. Tailwind theme: dark background, amber/orange accent, deliberate typography — should not look like a default Vite+React scaffold.
2. `README.md`: what it is, the three-layer thesis in 3 lines, how to run both halves locally:
   ```
   # backend
   cd backend && pip install -r requirements.txt
   python scripts/bootstrap.py     # cleans data, builds priors, trains models
   uvicorn main:app --reload --port 8000

   # frontend (separate terminal)
   cd frontend && npm install
   cp .env.example .env.local      # set VITE_API_BASE_URL if needed
   npm run dev
   ```
3. **Deploy the backend** to Render (free tier — `uvicorn main:app --host 0.0.0.0 --port $PORT`, build command `pip install -r requirements.txt`) or Railway. Commit `backend/models_store/*.joblib` and `backend/data/processed/*.parquet` directly to the repo rather than training on every cold start — the dataset is ~4.5MB and models are small, so this is simpler and more deploy-reliable. Set `FRONTEND_ORIGIN` env var on the host to the deployed frontend's URL once you have it.
4. **Deploy the frontend** to Vercel (auto-detects Vite). Set `VITE_API_BASE_URL` in Vercel's project env vars to the deployed backend URL. Redeploy frontend after backend URL is known, and update `FRONTEND_ORIGIN` on the backend after the frontend URL is known — these two are circularly dependent, do backend first, frontend second, then one backend env-var update pass.
5. **Free-tier cold starts are real.** Render's free tier sleeps after inactivity and can take 30+ seconds to wake. Ping the backend `/api/health` a few minutes before any live demo so it's warm.

**Definition of Done:** two public URLs — a backend API and a frontend app pointing at it — that a judge can open on their own laptop and click through the full golden path with no local setup.

---

## 11. Phase 6 — Stretch goals (only after Phase 5 is deployed and verified working)

Do these in order, stop whenever time runs out — each is additive and independent, none should risk breaking the working core:

1. Survival analysis for duration (replace/augment the regression with `lifelines` `CoxPHFitter` to properly handle the ~62% right-censored rows instead of training only on the closed subset) — flag clearly in the frontend as "v2 model" so you can talk about the upgrade in the pitch even if you ship v1.
2. An ILP-based allocator upgrade (PuLP) as an alternative to the greedy allocator, toggleable via a query param, for the "we know the more rigorous version too" talking point.
3. A "what-if" simulator on the Live Map page: drag a hypothetical event marker and see a live-updating EIS without a full page navigation (debounced calls to `/api/events/triage`).
4. Free-text `description` enrichment: a small rule-based or LLM-based parser that pulls structured hints (e.g. "no traffic problem" vs "slow movement") out of the bilingual `description` field — new endpoint, optional, never required for the core demo to run.
5. WebSocket or polling-based "live" feel on the Live Map page (auto-refresh active events every N seconds) — purely cosmetic, low priority.

---

## 12. Things to explicitly avoid

- Don't pull in `osmnx`, live routing APIs, or any external API key as a hard dependency for the core path — the demo must work fully offline / without secrets.
- Don't use `lightgbm`/`xgboost` for the core models — stick to scikit-learn's `HistGradientBoosting*` to avoid binary-compatibility deploy failures.
- Don't fabricate manpower ground truth or a fake diversion route where the data has none — say so in the UI instead. Honesty about data gaps is part of the pitch, not a weakness to hide.
- Don't use a random train/test split for the duration or closure models — temporal split only, this is a forecasting system.
- Don't drop the Insights page (Phase 4) for time — it's your evidence that you understood the problem, not just built a model.
- Don't let the frontend silently guess at response shapes — if a backend response doesn't match Section 4 exactly, fix the backend (or update Section 4's record of the deviation in your final summary), don't patch around it in the frontend.
- Don't forget CORS — this is the #1 silent failure mode in a FastAPI+React split. Verify `/api/health` is reachable from the frontend before building anything else (Phase 0's Definition of Done exists specifically to catch this early).

---

## 13. Final summary requirement

When the golden path is deployed and working, give a short summary covering: the backend URL and frontend URL, which Phase 6 stretch items (if any) were completed, any deviation from this spec (especially from the Section 4 API contract) and why, and the exact local run commands for both halves for re-verification before the judges see it.