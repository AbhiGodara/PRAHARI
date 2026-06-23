# 🛡️ PRAHARI — Event-Driven Traffic Congestion Intelligence

> **Flipkart GRiD Lock 2.0 Solution** for active & predictive traffic management in Bengaluru. Built and trained on **8,173 real ASTraM events** (Nov 2023 – Apr 2024).

---

## ⚡ The Three Pillars of PRAHARI

| Pillar | How it Works | Impact |
| :--- | :--- | :--- |
| **🔮 PREDICT** | Machine learning predicts duration, closure probability, and computes a dynamic **Event Impact Score (EIS: 0–100)**. | **< 5ms latency** via vectorized batch ML scoring & raw JSON caching. |
| **👮 DEPLOY** | Greedy resource allocator matches EIS ranks with officer availability, generating custom barricade geometry & diversion paths. | **Optimized division of manpower** during concurrent event spikes. |
| **📈 LEARN** | Post-event debrief form appends fresh ground-truth data, triggering automatic incremental model retraining. | **Continuous feedback loop** — every closed event sharpens the next prediction. |

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python scripts/bootstrap.py       # Cleans data, builds priors, and trains ML models
uvicorn main:app --reload --port 8000
```
*API endpoints will be available at `http://localhost:8000` (Health Check: `/api/health`).*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend will be running at `http://localhost:5173`.*

---

## ⚡ Key Optimizations Built In

- **Vectorized ML Batch Scoring:** Scores 100+ active events in a single vectorized pass instead of loop-based serial model predictions (reducing live map computation time from ~60s down to milliseconds).
- **Startup Pre-Warming:** Pre-loads Parquet data, pre-computes location priors, and loads ML models into memory during API startup.
- **Zero-Serialization Cache:** Caches responses as raw JSON bytes to bypass Pydantic model serialization overhead on repeated live-map requests.

---

## 🛠️ Tech Stack

- **Backend:** FastAPI, scikit-learn (HistGradientBoosting), Pandas, SQLite, Joblib
- **Frontend:** React, Vite, Tailwind CSS, Leaflet + Leaflet.heat (Heatmaps), Recharts
- **Dataset:** 8,173 anonymized Bengaluru traffic events (ASTraM)
