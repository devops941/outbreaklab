# OutbreakLab: Infectious Disease Scenario Modelling & Intervention Simulator (Dashboard Website)

**Type:** Final-year project | **Domain:** Public Health Analytics | **Purpose:** preparedness education and policy scenario exploration (NOT individual risk prediction, NOT a real-outbreak forecast)
**Product style:** Real multi-page **website with login screens, roles, and data entry inside the app**. Light theme only, with its own "Atlas Violet" colour system and a **node-graph scenario studio** layout. NOT Streamlit.
**Stack:** React 18 + TypeScript (Vite) + Tailwind + shadcn/ui + React Flow, FastAPI, Python (NumPy, SciPy, pandas, matplotlib), **MongoDB Atlas (PyMongo)**, config in **`.env`**.

> **Instructions for Claude Code:** Read this whole file. Build phase by phase using the prompts in Section 17. After each phase run tests and check acceptance criteria before moving on. Ask only if truly blocked.
> **Hard rules:**
> 1. No Streamlit/Dash. UI = React + Vite + TypeScript calling a FastAPI REST API.
> 2. Database = MongoDB Atlas via PyMongo. All secrets/settings live in `.env` only. Never write a real credential into any committed file (`.env.example`, README, tests, comments). The developer pastes the real URI into the local git-ignored `.env`.
> 3. Python owns all simulation, statistics, optimisation and report logic. React only collects inputs, calls the API and displays results.
> 4. Light theme only. Use the Section 11 tokens, fonts, shapes and the Section 11.4 layout exactly. **This UI must be completely different from every other project I have built** (colours, fonts, navigation, page structure, option placement). See the banned list in 11.1.
> 5. App opens already populated with seed data (populations, pathogens, contact matrices, scenarios, finished runs); every dataset supports create/edit/delete from the UI.
> 6. All results are labelled **"hypothetical scenario, not a forecast or a prediction for any person or real outbreak"**. Seed parameters are illustrative archetypes, not calibrated to a real pathogen.

---

## 1. Vision
During an outbreak, decision-makers ask "what if": what if contacts fall by 30%, schools close, a vaccine campaign starts on day 60, testing and isolation catch half of the cases? OutbreakLab is a **scenario workshop**: users define a population (age groups), a pathogen archetype, contact patterns, and a set of interventions on a visual canvas, run **deterministic and stochastic simulations**, compare scenarios on health and cost outcomes, find **thresholds** (e.g. the minimum contact reduction that keeps hospital demand under capacity), run sensitivity analysis, and write a **policy brief**.

## 2. Objectives
1. Website with landing, login/register, role-based app, in-app data entry.
2. System parameter configuration (population, pathogen, hospital capacity) and **assumption setup with input distributions**.
3. Python engine: **age-structured SEIR-H-D-V model** (ODE), stochastic Monte Carlo, optional case-data calibration.
4. Interventions: contact reduction by setting, vaccination campaign, testing/isolation, quarantine, with timing and compliance.
5. **Scenario execution and comparison** (time, cost, utilisation, risk): peak, attack rate, deaths, hospital peak vs capacity, Rt, cost per death averted.
6. **Threshold finder** and **sensitivity analysis**.
7. Performance dashboard and downloadable **policy brief** (PDF/Excel/CSV).
8. All data in MongoDB, configured only through `.env`.

## 3. Scope
**In:** auth, roles, data entry/import, simulation engines, interventions, scenario graph, comparison, thresholds, sensitivity, calibration, briefs, admin. **Out:** individual risk scoring, real-time surveillance feeds, contact tracing of real people, agent-level mobility data, deep learning, native apps.

## 4. Roles and Login Screens
| Role | Access |
|---|---|
| **Analyst / Student** | Own scenarios, runs, datasets, briefs; read shared library |
| **Instructor / Admin** | Everything + shared pathogens and populations, users, audit log, jobs |

Screens: **conversational sign-in** (one question per screen, see 11.4), register, forgot/reset (admin-issued token, no email needed), profile. JWT access + refresh, route guards, bcrypt, rate limiting, lockout after 5 failures. First admin via `scripts/create_admin.py` using `.env`.

## 5. Data Entry and Sources
| Dataset | Fields |
|---|---|
| Populations | name, total N, age groups (e.g. 0-4, 5-17, 18-49, 50-64, 65+) with counts, initial immunity per group, hospital beds and ICU beds |
| Pathogen archetypes | name, R0 or beta, latent_days, infectious_days, hospitalisation fraction by age, hospital stay days, IFR by age, asymptomatic fraction, relative infectiousness of asymptomatic, waning immunity (optional). **Illustrative** (respiratory flu-like, fast respiratory, slow childhood-type, severe-in-elderly) |
| Contact matrices | age × age matrix split into layers: home, school, work, community; editable heatmap grid |
| Interventions library | type, parameters, start/end day, compliance, cost per day or per dose |
| Observed case reports (optional) | date, reported cases (and deaths, hospital admissions) for calibration |
| Scenarios | population + pathogen + matrix + interventions + distributions + run settings, stored as a **graph** (nodes and edges) |

Entry in the app: forms, an editable **age-pyramid** (drag bars), an editable **contact-matrix heatmap**, paste-from-spreadsheet for case reports, CSV import wizard (upload → map columns → validation → commit).
**Seed data (`scripts/seed.py`):** admin + demo analyst, 3 populations (small town, city district, rural), 4-5 illustrative pathogens, 3 synthetic contact matrices with layers, 10-12 interventions, 8 scenarios, 6 finished runs, one threshold search, one sensitivity analysis, one brief, one case-report dataset with messy rows. Label all **"illustrative demo data for education"**.

**Validation:** N ≥ 1; age counts sum to N; fractions in [0,1]; rates ≥ 0; matrix square, non-negative, matching the age groups, reciprocity check (flag, with an "auto-balance" option); R0 plausible range (0.5-20) warning; intervention start < end, compliance 0-1; distribution parameters valid (low < mode < high, sd > 0); horizon 1-730 days; Monte Carlo runs 10-5000; CSV row-level error table with "import valid rows only"; duplicates by date (keep first/last/sum). All writes audited.

## 6. System Flow
```
Login -> role-based app
 [1] Data entry/import -> validation -> MongoDB
 [2] Assumption setup: distributions, contact layers, interventions
 [3] Scenario graph built on the canvas
 [4] Engine: age-structured ODE | stochastic Monte Carlo
 [5] Metrics + Rt + capacity checks + cost
 [6] Comparison, threshold finder, sensitivity, calibration
 [7] Dashboard, policy brief, export
```
Runs execute as FastAPI background tasks with progress polling, cancel and time limits; every run stores a full parameter snapshot + seed.

## 7. Methods

### 7.1 Model (deterministic, age-structured)
Groups `i = 1..G`. Compartments per group: **S, E, A (asymptomatic infectious), I (symptomatic infectious), H (hospitalised), R, D (dead), V (vaccinated, protected)**.
```
lambda_i(t) = q * sum_j C_ij(t) * ( I_j + rho * A_j ) / N_j          (force of infection)
dS_i/dt = - lambda_i S_i - nu_i(t)                                   (nu = vaccination rate)
dV_i/dt =   nu_i(t) * eff_i - waning...  (leaky option: vaccinated still exposed at (1 - eff))
dE_i/dt =   lambda_i (S_i + (1-eff) V_i) - sigma E_i
dA_i/dt =   p_asym sigma E_i - gamma A_i
dI_i/dt =  (1 - p_asym) sigma E_i - (gamma + h_i) I_i      (h_i = hospitalisation rate by age)
dH_i/dt =   h_i I_i - (eta_i + mu_i) H_i                   (eta = discharge, mu = death rate in hospital)
dR_i/dt =   gamma (A_i + I_i) + eta_i H_i
dD_i/dt =   mu_i H_i
```
`q` is the transmissibility scaled so the chosen **R0** is reproduced (see 7.3). `C_ij(t)` = sum over layers of `C_layer_ij × (1 − reduction_layer(t) × compliance)`. Solve with `scipy.integrate.solve_ivp` (LSODA), event-aware at intervention start/end days. Population is closed (no births/deaths other than disease) unless waning is on.

### 7.2 Interventions (all are time-windowed, compliance-scaled)
- **Contact reduction by layer** (school closure, work-from-home, community distancing, masks as a multiplier on q).
- **Vaccination campaign:** start day, doses/day, priority by age order, coverage cap, efficacy (leaky or all-or-nothing), delay to protection.
- **Testing and isolation:** detect fraction, delay days; detected symptomatic cases reduce their contacts by an isolation factor.
- **Quarantine/travel limits:** reduction of imported seeding (optional).
- Cost model (illustrative, editable): cost per day per intervention, per dose, per hospital bed-day, per death (value placeholder optional).

### 7.3 Reproduction numbers and thresholds
- **R0 via the next-generation matrix:** `R0 = spectral_radius(K)` with `K_ij = q * C_ij * (rho * p_asym/gamma + (1-p_asym)/(gamma + h_i))` (use SciPy eigenvalues); calibrate `q` so R0 matches the user's R0. For a homogeneous matrix this reduces to `beta/gamma`.
- **Rt** over time = spectral radius of `K` scaled by current susceptibility and contact settings.
- **Herd-immunity threshold** `1 - 1/R0` (homogeneous reference); effective critical coverage reported with the vaccine efficacy.
- **Final-size** reference: `z = 1 - exp(-R0 z)` for the homogeneous case (used in tests).

### 7.4 Stochastic model (Monte Carlo)
Binomial chain per day per age group with the same transitions, fixed seed via `numpy.random.default_rng`, optional parameter draws from distributions each run (default 500 runs). Output: median and 5/95 percentile envelopes, distribution of peak size, time to peak, deaths, **probability of major outbreak vs early extinction**, probability hospital demand exceeds capacity.

### 7.5 Outcome metrics
Peak symptomatic prevalence and day, **time to peak**, attack rate (overall and by age), cumulative cases, **peak hospital occupancy vs beds, ICU vs ICU capacity, days over capacity**, deaths, years-of-life-lost proxy (illustrative), **cost total**, **cost per death averted** and **deaths averted vs baseline**, time to 5%/50% attack.

### 7.6 Scenario comparison
Compare 2-6 scenarios or runs; ranking by chosen metric (leaderboard), difference vs baseline, **Pareto frontier** of cost vs deaths averted (non-dominated scenarios highlighted), overlayed trajectories with uncertainty bands.

### 7.7 Threshold finder
Find the **minimum intervention strength** meeting a goal (e.g. peak hospital occupancy ≤ capacity, or attack rate ≤ x%): bracketing + `scipy.optimize.brentq` on a monotone 1-D parameter (contact reduction, vaccination rate, start day delay). Output: threshold value, achieved metric, curve of metric vs strength, and a plain-language statement. If the goal is unreachable within bounds, say so.

### 7.8 Sensitivity analysis
One-at-a-time tornado (±10%/±25%) and global **Latin Hypercube** sampling (`scipy.stats.qmc`), outputs ranked by Spearman and partial rank correlation; radial ranking chart plus scatter plots; plain-language "most influential assumptions".

### 7.9 Calibration (optional)
Fit `q` (and optionally the initial seed size and a reporting fraction) to the user's case reports with `scipy.optimize.least_squares` on daily incidence; report RMSE, parameter estimate, bootstrap interval, and a clear note that this is an illustrative fit.

## 8. Technology Stack
| Layer | Choice |
|---|---|
| Web | React 18, TypeScript, Vite |
| UI | Tailwind, shadcn/ui (Radix), lucide-react |
| Node canvas | **React Flow (`@xyflow/react`)** for the scenario graph |
| Charts | Recharts + custom SVG (radial sensitivity, age pyramid, matrix heatmap, Pareto) |
| Document editor | **TipTap** (block editor with custom live-chart blocks) |
| Forms / tables | React Hook Form + Zod, TanStack Table |
| Data / routing | TanStack Query, React Router |
| UX extras | framer-motion, sonner, cmdk, `@fontsource/sora`, `@fontsource/dm-sans`, `@fontsource/dm-mono` |
| Backend | FastAPI, Uvicorn, Pydantic v2, pydantic-settings |
| Auth | PyJWT, bcrypt, slowapi |
| DB | MongoDB Atlas via PyMongo |
| Simulation | NumPy, SciPy (`integrate`, `optimize`, `stats.qmc`, `linalg`), pandas |
| Reports | Jinja2, matplotlib, weasyprint, openpyxl |
| Tests | pytest + httpx, Vitest + RTL, optional Playwright |
| Quality | ruff, black, ESLint, Prettier, Git |
| Deploy | Docker + docker-compose (optional) |

## 9. MongoDB Collections
`users`, `populations`, `pathogens`, `contact_matrices`, `interventions`, `scenarios` (graph: nodes, edges, parameters), `runs` (snapshot, engine, seed, status, progress, summary), `run_results` (series by group and compartment, percentiles), `comparisons`, `threshold_searches`, `sensitivity_analyses`, `case_reports`, `calibrations`, `briefs` (block document JSON), `reports`, `notifications`, `import_jobs`, `audit_log`, `job_runs`.
Rules: repositories layer only; `jsonSchema` validators on users, populations, pathogens; idempotent seeding by upserts; big arrays in `run_results` (16 MB doc limit); tests use `MONGODB_TEST_DB_NAME`, never the main DB.

## 10. Environment (`.env`)
`.env` and `frontend/.env` are git-ignored; only `.env.example` files with placeholders are committed.
```env
APP_ENV=development
APP_HOST=127.0.0.1
APP_PORT=8000
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173

# Paste the real Atlas URI ONLY in your local .env. URL-encode special characters in the password.
MONGODB_URI=mongodb+srv://<db_user>:<url_encoded_password>@<cluster-host>/?retryWrites=true&w=majority
MONGODB_DB_NAME=outbreaklab
MONGODB_TEST_DB_NAME=outbreaklab_test
MONGODB_TIMEOUT_MS=8000

JWT_SECRET=change-me-to-a-long-random-string
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=7
MAX_FAILED_LOGINS=5
LOCKOUT_MINUTES=15
ADMIN_EMAIL=admin@outbreaklab.local
ADMIN_PASSWORD=change-me-strong

SIM_DEFAULT_SEED=42
SIM_MAX_DAYS=730
SIM_DEFAULT_MC_RUNS=500
SIM_MAX_MC_RUNS=5000
SENS_DEFAULT_SAMPLES=500
SIM_JOB_TIMEOUT_SEC=300

REPORT_DIR=outputs/reports
UPLOAD_DIR=data/uploads
MAX_UPLOAD_MB=10
```
`frontend/.env.example`: `VITE_API_BASE_URL=http://localhost:8000/api`, `VITE_APP_NAME=OutbreakLab`.
Rules: pydantic-settings, fail fast on missing/placeholder `MONGODB_URI` or `JWT_SECRET`; `/api/health` pings DB; least-privilege Atlas user (readWrite on this DB only); never log the URI.

## 11. UI / UX Design System: "Atlas Violet" (light)

### 11.1 Must be different from all earlier projects
**Banned (already used elsewhere): ** left sidebar; top navigation tabs; top stage switcher bar; floating bottom dock; KPI-card row at the top of a page; split-screen login; notebook-cover login; monitor wall of tiles; swimlane timelines; email-inbox triage; spreadsheet workspace with bottom sheet tabs; side-sheet editors; masonry card galleries; lineage boards; side-by-side "plates"; scrolling figure-story pages; outline + paper-preview or filmstrip report builders; bottom-drawer inspectors; tabs-over-a-table data pages. **Banned palettes:** green/gold farm, ice-blue, transit blue, parchment + terracotta, concrete + graphite + safety yellow. **Banned fonts:** Inter, Fraunces, Manrope, JetBrains Mono, IBM Plex.

### 11.2 Tokens
| Token | Value | Use |
|---|---|---|
| bg-base | `#F5F3FA` (lavender mist) | App background with a faint dot-grid |
| surface | `#FFFFFF` | Nodes, panels, popovers |
| surface-2 | `#EFEBF8` | Inputs, inactive chips |
| border | `#DDD6EE` | Borders (1px, plus soft layered shadows) |
| text | `#1E1535` (aubergine ink) | Main text |
| text-2 | `#52456F` | Secondary |
| text-3 | `#8479A3` | Hints |
| primary (violet) | `#5B21B6`, hover `#4C1D95`, soft `#EDE4FF`, on-primary `#FFFFFF` | Buttons, selected nodes, links |
| signal (pink) | `#F0489B` | Only the time-scrubber thumb, active-day marker, unread notification dot |
| UI states | success `#2F9E44`, warning `#C77700`, danger `#C92A2A`, info `#1C7ED6` with soft backgrounds | Toasts, validation |

**Compartment / outcome colours (semantic, charts only):** S `#3B5BDB`, E `#F08C00`, A `#E8A598`-stroke dashed `#D9480F`, I `#E03131`, H `#862E9C`, R `#2F9E44`, D `#343A40`, V `#12B886`, capacity line `#0B7285` dashed, intervention windows = translucent violet bands, uncertainty bands = series colour at 15%. Scenario palette: `#5B21B6`, `#E8590C`, `#0B7285`, `#C2255C`, `#5F3DC4`, `#2B8A3E`, `#1864AB`, `#495057`.
Accessibility: AA contrast; never colour alone (compartments also have distinct dash patterns and direct labels); visible focus ring `0 0 0 3px rgba(91,33,182,.35)`.

### 11.3 Type, shape, motion
**Sora** (headings, 600, wide geometric), **DM Sans** (body 14-15px), **DM Mono** (numbers, tables, IDs). Very **rounded shapes**: cards and nodes 20px, controls and chips fully pill-shaped (999px), layered soft shadows `0 1px 2px rgba(30,21,53,.06), 0 8px 24px rgba(91,33,182,.08)`. Backdrop dot-grid. Motion springy 200-280 ms via framer-motion, respects reduced motion.

### 11.4 Navigation and layout: "Scenario Studio" (graph-first, no persistent nav bar)
- **No sidebar, no top nav, no dock, no tab bar.** Navigation = a round **INDEX button** (top-left, violet) that opens a **full-screen typographic index overlay** (large Sora list of pages in two columns with one-line descriptions and keyboard letters; `G` then a letter jumps directly; `Esc` closes). A **case-file pill** (top-centre) shows the scenario name (editable) with a save state and a **Run capsule** (pink-outlined play button + progress ring). Top-right: avatar, notifications bell. Command palette on `Ctrl+Shift+P`.
- A persistent **global time scrubber** pinned to the bottom edge of every analytical page: a thin track with a pink thumb for "simulation day", play/pause, speed, and intervention markers on the track. Moving it drives every chart, matrix and map on the page simultaneously.

**Studio (home, `/studio/:id`): node-graph canvas.** React Flow canvas fills the screen (pan, zoom, minimap bottom-right). Nodes are rounded 20px cards connected by curved edges:
`[Population] → [Pathogen] → [Contacts] → [Intervention nodes ...] → [Simulation] → [Outcome nodes ...]`
- Clicking a node opens an **anchored popover editor** next to it (not a side panel): Population node = editable age pyramid; Pathogen node = parameters with distribution pickers; Contacts node = layered matrix heatmap with per-layer sliders; Intervention nodes (add as many; stackable) = timeline-window slider, compliance and cost; Simulation node = engine choice (ODE / Monte Carlo), horizon, runs, seed.
- **Outcome nodes** are live: add "Epidemic curve", "Hospital load vs capacity", "Deaths by age", "Rt over time", "Cost" nodes; each renders its chart inside the node and can be expanded to full screen. The Run capsule updates them.
- Right-click the canvas to add nodes; drag from a node's handle to the empty canvas to add the next one. Intervention windows appear as violet bands on all outcome charts.
- Mobile: the canvas falls back to a vertical step list of the same nodes.

**Library (`/library`, data entry): column board of datasets.** Four wide columns side by side (**Populations | Pathogens | Contact matrices | Case reports**), each a scrolling list of compact rows with a "+ New" at the top. Opening a row **expands it inline within its column into an editor accordion** (age pyramid editor, parameter form, matrix heatmap editor, paste grid). Dragging a file onto a column imports into that column (mapping + validation shown inline). No side-sheet, no tabs.

**Compare (`/compare`): leaderboard and Pareto.** Left 40%: an animated **leaderboard** of selected scenarios ranked by a metric chosen from a pill selector (deaths, peak hospital load, attack rate, cost, cost per death averted); each row has a horizontal bar, delta-vs-baseline chip and "what changed" chips. Right 60%: **Pareto scatter** (cost vs deaths averted, non-dominated points joined) over a **parallel-coordinates** chart of all metrics. The global scrubber animates trajectories in a small multiples strip under the leaderboard.

**Thresholds (`/thresholds`): "find the line" page.** A large sentence-style form at the top ("Keep **peak hospital load** under **capacity** by changing **school and work contact reduction** between **0% and 80%**") with inline pill selectors; result shown as a big **dial** (the threshold value) plus the curve of metric vs strength with the goal line and the found point.

**Sensitivity (`/sensitivity`): radial.** The chosen outcome sits in the centre of a **radial bar chart**; parameters radiate as spokes ordered by influence (rank correlation), tap a spoke to open a scatter plot in a centre-bottom popover. Tornado is a toggle ("ring / bars"). Method options live in a collapsible ring legend.

**Briefs (`/briefs`): block editor.** A single-column **TipTap document** with slash commands (`/chart`, `/table`, `/scenario`, `/threshold`, `/callout`) that insert **live blocks** bound to runs; a narrow right margin shows **annotations** and data-quality notes; title block on top; export (PDF/Excel/CSV) from a floating pill at the bottom-right. Briefs list = a simple vertical list with last edited.

**Calibration (`/calibrate`):** a **conversation-style wizard**: one large question per step ("Paste your daily cases" → "How many days to fit?" → "Review the fit"), result overlay on the reference curve. **Admin (`/admin`):** four-quadrant console (Users, Audit, Jobs, System) in a 2×2 grid. **Profile/About:** centred reading column with a table of contents pinned top-right.

**Conversational sign-in (Login/Register/Forgot):** a full-screen scene with an **agent-based background** (hundreds of small dots moving randomly; some turn red and then green as a miniature outbreak runs; calm and slow, static if reduced motion). In the centre, **one large question at a time** in Sora ("What's your email?" then "Your password"), a single oversized pill input, a violet "Continue ↵" button, progress dots below, and a tiny "Back" link. Register = "Let's get you a workbench" (name → email → password → confirm); Forgot = "Lost your way?". Error messages appear as a shaking inline line under the question.

**Landing (`/`):** a **full-viewport live agent simulation** with three floating pill controls (contacts, vaccination, isolation) that change the outbreak in real time; below, one scroll step reveals three short statements and the disclaimer. No feature-card grid, no hero image.

### 11.5 Component names
`IndexOverlay`, `CaseFilePill`, `RunCapsule`, `TimeScrubber`, `StudioCanvas`, `StudioNode` (+ `PopoverEditor`), `AgePyramidEditor`, `ContactMatrixEditor`, `DistributionPicker`, `InterventionWindow`, `OutcomeNode` (EpidemicCurve, HospitalLoad, DeathsByAge, RtChart, CostChart), `DatasetColumn` + `InlineEditorAccordion`, `DropImportColumn`, `Leaderboard`, `ParetoScatter`, `ParallelCoords`, `ThresholdSentence`, `ThresholdDial`, `RadialSensitivity`, `SpokeScatterPopover`, `BriefEditor` (TipTap) + `LiveChartBlock`, `MarginNotes`, `ConversationalSignIn`, `AgentBackdrop`, `QuadrantConsole`, toasts with undo, confirm dialogs, empty states with a single dotted-grid illustration.

## 12. API (under `/api`, Pydantic validated, errors as `{detail, code, fields}`)
Health; Auth (register, login, refresh, logout, me, change-password, forgot, reset); CRUD for populations, pathogens, contact-matrices (+ `POST /contact-matrices/{id}/balance`), interventions, case-reports, scenarios (graph JSON, duplicate), briefs; `POST /import/{kind}` + issues + commit; `POST /simulate` (engine ode|stochastic; background) + `GET /runs/{id}/status|/runs/{id}|/runs/{id}/series` + `POST /runs/{id}/cancel`; `GET /r0` (next-generation matrix preview for a draft scenario); `POST /compare`; `POST /thresholds`; `POST /sensitivity` + status/result; `POST /calibrate`; dashboard overview; reports (create, list, download) and exports; notifications; admin (users, audit log, jobs, system).

## 13. Pages (routes)
`/` Landing; `/login` `/register` `/forgot` conversational sign-in; `/studio/:id?` Studio; `/library` Library board; `/compare`; `/thresholds`; `/sensitivity`; `/briefs/:id?`; `/calibrate`; `/admin`; `/profile`; `/about` (equations, assumptions, limitations, disclaimer). All reachable through the Index overlay and the command palette.

## 14. Project Structure
```
outbreaklab/
|-- PROJECT_SPEC_OUTBREAKLAB.md  README.md  requirements.txt  .env.example  .gitignore  docker-compose.yml
|-- scripts/ (seed.py, create_admin.py)
|-- src/ (config.py, db/{mongo.py,repositories/}, data/{synthetic.py,validate.py,ingest.py},
|        sim/{model.py,ode.py,stochastic.py,interventions.py,r0.py,metrics.py,cost.py,thresholds.py,sensitivity.py,calibrate.py},
|        report/)
|-- backend/ (main.py, deps.py, schemas.py, security.py, jobs.py, routers/)
|-- frontend/ (.env.example, src/{api,components/{studio,charts,editors,forms,ui},pages,context,styles})
|-- tests/  docs/  outputs/reports
```

## 15. Testing Plan
Config fail-fast; URI never logged; test DB isolation; auth lockout/JWT expiry; role guards. Validation: one test per rule; messy case-report rows detected; non-reciprocal matrix flagged. **Model correctness:** population conserved (S+E+A+I+H+R+D+V per group constant); non-negative states; homogeneous one-group case equals classic SEIR; **R0 from the next-generation matrix equals beta/gamma** in the homogeneous case and the calibration of `q` reproduces the requested R0; R0 < 1 gives decay, R0 > 1 an outbreak; final size matches `z = 1 - exp(-R0 z)`; herd-immunity threshold check; interventions reduce attack rate/deaths monotonically; vaccination with 0 efficacy changes nothing; stochastic mean approaches ODE for large N; fixed seed reproducible; extinction probability near `(1/R0)^I0` for the simple case; threshold finder returns a value where the metric equals the goal within tolerance, and reports unreachable goals; Pareto set contains only non-dominated points; LHS sign checks; calibration recovers a known `q`. API: run lifecycle (queued → running → done/cancelled/failed), field-level errors, owner scoping. Frontend: component tests for `StudioNode` popovers, `AgePyramidEditor`, `ContactMatrixEditor`, `Leaderboard` ordering, `ConversationalSignIn` flow, `BriefEditor` slash-insert; zero TS errors.

## 16. Risks
| Risk | Mitigation |
|---|---|
| Results mistaken for real forecasts | Persistent "hypothetical scenario" banner, wording, report footer, About page |
| Illustrative parameters taken as real | Labels on every seed pathogen, calibration page, documentation |
| Slow Monte Carlo/age-structured runs | Background jobs, limits, vectorised NumPy, time limits, progress polling |
| Irreproducible runs | Seed + full snapshot stored per run |
| Node-graph UI complexity | Fixed node types, validated connections, mobile list fallback |
| Secrets exposed | `.env` git-ignored, placeholders only, least-privilege Atlas user, rotate any credential ever shared |
| UI drifting to earlier projects' look | Section 11.1 banned list enforced in review |

## 17. Phases and Claude Code Prompts (use in order)

**Phase 1 (Week 1): Setup, design, study.**
> `Read PROJECT_SPEC_OUTBREAKLAB.md. Do Phase 1 only: repo structure from Section 14, requirements.txt, .gitignore including .env and frontend/.env, both .env.example files from Section 10 with placeholders only, src/config.py with pydantic-settings failing fast on missing or placeholder MONGODB_URI and JWT_SECRET, a README, docs/theme.md recording the Atlas Violet tokens and the banned-pattern list from 11.1, and docs/ wireframes for the conversational sign-in, Studio canvas, Library board, Compare leaderboard, Thresholds, Sensitivity radial and Brief editor. No Streamlit. Never write a real credential anywhere. Acceptance: app refuses to start with a clear message when env is missing.`

**Phase 2 (Week 2): MongoDB and auth.**
> `Implement Phase 2: src/db/mongo.py (MongoClient from env, ping, ensure_indexes, jsonSchema validators), repositories with owner filtering, users collection, JWT register/login/refresh/logout with bcrypt, rate limiting and lockout, audit log, /api/health, scripts/create_admin.py. Tests use MONGODB_TEST_DB_NAME and clean up.`

**Phase 3 (Week 3): Seed data and data-entry APIs.**
> `Implement Phase 3: synthetic generators (populations by age, layered contact matrices, pathogen archetypes, interventions, scenarios, messy case reports), scripts/seed.py (idempotent, labelled illustrative), CRUD APIs per Section 5 with Pydantic validation (matrix reciprocity check and auto-balance, age-sum check), audit logging, and CSV import with a row-level error report.`

**Phase 4 (Week 4): R0 and the ODE model.**
> `Implement Phase 4: src/sim/model.py and ode.py (age-structured S,E,A,I,H,R,D,V model per 7.1 using scipy solve_ivp, event-aware at intervention boundaries) and r0.py (next-generation matrix, q calibration to a target R0, Rt over time, herd-immunity threshold). Tests: conservation, homogeneous equivalence to SEIR, R0 equals beta/gamma, R0<1 decay, final-size relation.`

**Phase 5 (Week 5): Interventions, metrics, cost.**
> `Implement Phase 5: interventions.py (layer-wise contact reduction with compliance, vaccination campaign with priority, efficacy and delay, testing and isolation, masks), metrics.py per 7.5 (peak, attack rate by age, hospital and ICU occupancy vs capacity, days over capacity, deaths) and cost.py (cost per death averted vs baseline). Tests: monotone effect of stronger interventions, zero-efficacy vaccine changes nothing.`

**Phase 6 (Week 6): Stochastic engine.**
> `Implement Phase 6: stochastic.py per 7.4 (binomial chain per age group, seeded RNG, parameter draws from distributions, percentile envelopes, major-outbreak vs extinction probability, probability of exceeding capacity). Tests: seed reproducibility, mean approaches ODE at large N, extinction probability near (1/R0)^I0 in the simple case.`

**Phase 7 (Week 7): Runs, comparison, thresholds.**
> `Implement Phase 7: POST /simulate as background jobs with status, progress, cancel and time limit storing a full parameter snapshot and seed in runs and big arrays in run_results; POST /compare with leaderboard metrics, delta vs baseline and Pareto frontier; thresholds.py with bracketing and scipy brentq and POST /thresholds including the unreachable-goal case. Tests per Section 15.`

**Phase 8 (Week 8): Sensitivity and calibration.**
> `Implement Phase 8: sensitivity.py (one-at-a-time tornado, Latin Hypercube with Spearman and partial rank correlation via scipy.stats.qmc) and calibrate.py (least_squares fit of q, seed size and reporting fraction with RMSE and bootstrap interval) as background jobs with APIs and tests.`

**Phase 9 (Week 9): API completion, briefs, reports.**
> `Implement Phase 9: remaining routers from Section 12 (dashboard overview, briefs storing block-document JSON, notifications, reports, exports, admin), PDF/Excel/CSV report generation (Jinja2, matplotlib, weasyprint, openpyxl) including parameters, seed, curves, metrics and disclaimers, and API tests for every router including owner scoping, role guards and field-level errors.`

**Phase 10 (Week 10): Frontend foundation and theme.**
> `Implement Phase 10 in frontend/: React 18, TypeScript, Vite, Tailwind, shadcn/ui, lucide-react, TanStack Query/Table, React Hook Form + Zod, framer-motion, sonner, cmdk, @xyflow/react, @tiptap/react, @fontsource/sora, @fontsource/dm-sans, @fontsource/dm-mono. Apply the Atlas Violet tokens from 11.2 and the type/shape rules from 11.3 exactly. Build ONLY the navigation described in 11.4: the round INDEX button with the full-screen IndexOverlay (G + letter shortcuts), the CaseFilePill with RunCapsule, the global TimeScrubber, notifications bell and avatar menu, command palette on Ctrl+Shift+P. Do NOT build a sidebar, top nav, dock, tab bar or KPI-card row. Build the ConversationalSignIn (one question per screen) with the AgentBackdrop, route guards, and a typed API client reading VITE_API_BASE_URL. Acceptance: login works against the real API; keyboard navigable; zero TypeScript errors.`

**Phase 11 (Weeks 10-11): Studio canvas.**
> `Implement Phase 11: the Studio page per 11.4 with React Flow: node types Population (AgePyramidEditor), Pathogen (DistributionPicker), Contacts (ContactMatrixEditor with per-layer sliders), Intervention (InterventionWindow, stackable), Simulation, and live OutcomeNodes (EpidemicCurve, HospitalLoad vs capacity, DeathsByAge, RtChart, CostChart) that expand full screen; anchored popover editors; connection validation; save/restore the graph to scenarios; Run capsule with progress and cancel; the TimeScrubber driving all outcome nodes; mobile step-list fallback. Use the semantic compartment colours from 11.2 with distinct dash patterns.`

**Phase 12 (Week 11-12): Library, Compare, Thresholds, Sensitivity.**
> `Implement Phase 12: Library as four side-by-side dataset columns with inline expanding editors and per-column file drop import (no tabs, no side sheet); Compare with the animated Leaderboard, metric pill selector, ParetoScatter, ParallelCoords and small-multiples strip; Thresholds with the sentence-style form, ThresholdDial and metric-vs-strength curve; Sensitivity with RadialSensitivity, spoke scatter popover and a ring/bars toggle.`

**Phase 13 (Week 12): Briefs, calibration, admin, landing, polish.**
> `Implement Phase 13: Brief editor (TipTap with slash commands inserting live chart/table/scenario/threshold blocks, right margin notes, floating export pill), conversation-style Calibration wizard, 2x2 QuadrantConsole admin, Profile and About (with pinned table of contents), and the Landing page with a full-viewport live agent simulation and three floating control pills. Then finish: backend coverage 70%+, Vitest component tests, optional Playwright journey (conversational sign-in -> build a scenario on the canvas -> run -> compare on the leaderboard -> find a threshold -> write and export a brief), accessibility and responsive polish, a docs/ui-uniqueness-check.md confirming none of the 11.1 banned patterns are used, README with Atlas + .env setup and troubleshooting, optional docker-compose, and a demo script.`

## 18. Deliverables Checklist
- [ ] Website: landing, conversational sign-in, role-based app
- [ ] Data entry (populations, pathogens, matrices, case reports) with validation, CSV import, audit trail
- [ ] Age-structured SEIR-H-D-V engine, stochastic Monte Carlo, interventions and cost
- [ ] Scenario comparison with Pareto frontier, threshold finder, sensitivity, calibration
- [ ] Block-editor policy briefs with PDF/Excel/CSV export
- [ ] Atlas Violet theme and the graph-first Scenario Studio layout (unique among my projects)
- [ ] FastAPI with Swagger docs, MongoDB via `.env` only
- [ ] README, demo script, tests, final report and slides
- [ ] Future work: network/agent-based contact models, real surveillance data feeds, spatial metapopulation model, variant and waning-immunity modules, health-economic evaluation extensions

## 19. References
Kermack & McKendrick (1927); Anderson & May: Infectious Diseases of Humans; Diekmann, Heesterbeek & Metz (1990) next-generation matrix; van den Driessche & Watmough (2002); Keeling & Rohani: Modeling Infectious Diseases; Prem et al. synthetic contact matrices; Saltelli et al.: Global Sensitivity Analysis; SciPy (`integrate`, `optimize`, `linalg`, `stats.qmc`), NumPy, React Flow, TipTap, MongoDB Atlas/PyMongo, FastAPI, React, Vite, Tailwind, shadcn/ui, Recharts documentation.
