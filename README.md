# OutbreakLab: Infectious Disease Scenario Modelling & Intervention Simulator

> **Purpose:** Preparedness education and policy scenario exploration (NOT a real-outbreak forecast or individual risk prediction).

OutbreakLab is a scenario workshop platform designed with the **2026 Atlas Violet light design system** (strictly NO generic blue palettes). It allows policymakers and analysts to model age-stratified populations, pathogen archetypes, and layered contact dynamics using both **deterministic ODE integration (SciPy LSODA)** and **stochastic Monte Carlo ensembles**, comparing public health trade-offs on the **Pareto frontier** and finding exact intervention thresholds.

---

## 📁 Clean Architecture
Strictly separated into two isolated directories:
```
outbreaklab/
├── backend/    # FastAPI, NumPy, SciPy, PyMongo, Mathematical Engines, Seed scripts
└── frontend/   # React 18, TypeScript, Vite, Tailwind CSS, Atlas Violet Design System
```

---

## 🛠️ Quick Start

### 1. Backend Setup & Run
```bash
cd backend
python -m pip install -r requirements.txt
python scripts/seed.py
python main.py
```
- API runs at: `http://127.0.0.1:8000`
- Swagger Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 2. Frontend Setup & Run
```bash
cd frontend
npm install
npm run dev
```
- Web app opens at: `http://localhost:5173`

---

## 🔑 Pre-seeded Demo Accounts
- **Analyst**: `analyst@outbreaklab.local` / `AnalystPass2026!`
- **Administrator**: `admin@outbreaklab.local` / `AdminOutbreakLab2026!`

---

## 🎨 2026 Atlas Violet Aesthetic System
- **Background Base**: Soft Lavender Mist (`#F5F3FA`) with radial dot grid pattern
- **Primary Accent**: Royal Atlas Violet (`#5B21B6`), Hover (`#4C1D95`), Soft (`#EDE4FF`)
- **Signal Marker**: Hot Signal Pink (`#F0489B`) for timeline scrubber and live indicators
- **Semantic Colors**: Emerald Jade (`#059669`), Warm Amber (`#D97706`), Crimson Alert (`#E11D48`), Plum (`#862E9C`)
- **Strict Rule**: No generic blue/indigo palettes used anywhere in the application.

---

## 🔬 Core Capabilities
1. **Scenario Studio Canvas**: Visual node graph connecting Population, Pathogen, Contacts, Interventions, Simulation, and Live Outcome Charts.
2. **Data Ingestion Hub**: Upload CSV/Excel/JSON files with column mapping and row-level validation committed to MongoDB Atlas.
3. **Dataset Library**: Four-column board (Populations | Pathogens | Contact Matrices | Surveillance) with inline expanding accordion editors and auto-balance reciprocity.
4. **Scenario Comparison**: Leaderboard ranked by metric and 2D Pareto frontier (Cost vs Deaths Averted).
5. **Threshold Finder**: Brent's method root-finding for minimum intervention strength needed to satisfy capacity constraints.
6. **Sensitivity Analysis**: Latin Hypercube sampling (LHS) with radial spokes ranked by Spearman correlation.
7. **Model Calibration**: 3-step conversational wizard fitting transmissibility $q$ against observed incidence.
8. **Policy Briefs**: Block document editor with embedded live charts and instant CSV, Excel, and JSON exports.
