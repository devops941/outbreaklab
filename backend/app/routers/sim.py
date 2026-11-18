from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.schemas.all_schemas import SimulateRequest, RunOut, RunMetrics
from app.db.repositories import get_repo, get_audit_repo, serialize_doc, now_iso
from app.deps import get_current_user
from app.sim.ode import run_ode_simulation
from app.sim.stochastic import run_stochastic_simulation
from app.sim.metrics import compute_outcome_metrics
from app.sim.cost import compute_intervention_costs
from app.sim.r0 import calibrate_q_for_r0, compute_next_generation_matrix, compute_spectral_radius

router = APIRouter(prefix="", tags=["Simulation"])

def execute_simulation_task(run_id: str, payload: dict, user_id: str):
    runs_repo = get_repo("runs")
    results_repo = get_repo("run_results")

    try:
        runs_repo.update(run_id, {"status": "running", "progress": 0.2})

        pop_repo = get_repo("populations")
        path_repo = get_repo("pathogens")
        mat_repo = get_repo("contact_matrices")
        inv_repo = get_repo("interventions")

        pop = pop_repo.get_by_id(payload["population_id"])
        path = path_repo.get_by_id(payload["pathogen_id"])
        mat = mat_repo.get_by_id(payload["contact_matrix_id"])

        if not pop or not path or not mat:
            runs_repo.update(run_id, {
                "status": "failed",
                "error": "Required population, pathogen or contact matrix dataset was not found.",
                "progress": 1.0
            })
            return

        inv_ids = payload.get("intervention_ids", [])
        interventions = [inv_repo.get_by_id(iid) for iid in inv_ids if inv_repo.get_by_id(iid)]

        engine = payload.get("engine", "ode")
        horizon = int(payload.get("horizon_days", 180))
        seed = int(payload.get("seed", 42))
        mc_runs = int(payload.get("monte_carlo_runs", 100))
        init_infected = payload.get("initial_infected_per_group")

        runs_repo.update(run_id, {"progress": 0.5})

        if engine == "stochastic":
            sim_output = run_stochastic_simulation(
                population=pop,
                pathogen=path,
                contact_matrix=mat,
                interventions=interventions,
                horizon_days=horizon,
                mc_runs=mc_runs,
                seed=seed,
                initial_infected=init_infected
            )
        else:
            sim_output = run_ode_simulation(
                population=pop,
                pathogen=path,
                contact_matrix=mat,
                interventions=interventions,
                horizon_days=horizon,
                initial_infected=init_infected
            )

        runs_repo.update(run_id, {"progress": 0.8})

        # Calculate costs and outcomes
        cost_info = compute_intervention_costs(interventions, sim_output)
        metrics = compute_outcome_metrics(pop, sim_output, cost_info)

        # Store series into run_results
        results_repo.create({
            "run_id": run_id,
            "days": sim_output.get("days", []),
            "daily_results": sim_output.get("daily_results", []),
            "rt_series": sim_output.get("rt_series", [])
        })

        # Update run document
        runs_repo.update(run_id, {
            "status": "completed",
            "progress": 1.0,
            "metrics": metrics,
            "completed_at": now_iso()
        })

    except Exception as e:
        runs_repo.update(run_id, {
            "status": "failed",
            "error": str(e),
            "progress": 1.0
        })

@router.post("/simulate")
def start_simulation(
    req: SimulateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    runs_repo = get_repo("runs")
    scen_repo = get_repo("scenarios")

    # If scenario_id provided, populate parameters from it
    payload = req.model_dump()
    scenario_name = "Ad-hoc Run"
    if req.scenario_id:
        scen = scen_repo.get_by_id(req.scenario_id)
        if scen:
            scenario_name = scen.get("name", "Scenario Run")
            payload["population_id"] = payload.get("population_id") or scen.get("population_id")
            payload["pathogen_id"] = payload.get("pathogen_id") or scen.get("pathogen_id")
            payload["contact_matrix_id"] = payload.get("contact_matrix_id") or scen.get("contact_matrix_id")
            if not payload.get("intervention_ids"):
                payload["intervention_ids"] = scen.get("intervention_ids", [])
            if not req.initial_infected_per_group:
                payload["initial_infected_per_group"] = scen.get("initial_infected_per_group")

    if not payload.get("population_id") or not payload.get("pathogen_id") or not payload.get("contact_matrix_id"):
        raise HTTPException(
            status_code=400,
            detail="population_id, pathogen_id, and contact_matrix_id are required to simulate."
        )

    run_doc = runs_repo.create({
        "scenario_id": req.scenario_id,
        "scenario_name": scenario_name,
        "owner_id": current_user["id"],
        "status": "queued",
        "progress": 0.0,
        "engine": payload.get("engine", "ode"),
        "horizon_days": payload.get("horizon_days", 180),
        "seed": payload.get("seed", 42),
        "payload_snapshot": payload,
        "metrics": None
    })

    # For fast turnaround on ODE models, we can execute immediately or dispatch background task
    execute_simulation_task(run_doc["id"], payload, current_user["id"])

    completed_run = runs_repo.get_by_id(run_doc["id"])
    return completed_run

@router.get("/runs", response_model=List[RunOut])
def list_runs(scenario_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    runs_repo = get_repo("runs")
    query = {"owner_id": current_user["id"]}
    if scenario_id:
        query["scenario_id"] = scenario_id
    return runs_repo.list(query, limit=50, sort_by="created_at", sort_desc=True)

@router.get("/runs/{run_id}", response_model=RunOut)
def get_run(run_id: str, current_user: dict = Depends(get_current_user)):
    runs_repo = get_repo("runs")
    run = runs_repo.get_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run

@router.get("/runs/{run_id}/status")
def get_run_status(run_id: str, current_user: dict = Depends(get_current_user)):
    runs_repo = get_repo("runs")
    run = runs_repo.get_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return {
        "id": run["id"],
        "status": run.get("status"),
        "progress": run.get("progress", 0.0),
        "error": run.get("error")
    }

@router.get("/runs/{run_id}/series")
def get_run_series(run_id: str, current_user: dict = Depends(get_current_user)):
    results_repo = get_repo("run_results")
    res = results_repo.col.find_one({"run_id": run_id})
    if not res:
        raise HTTPException(status_code=404, detail="Simulation time series not found for this run")
    return serialize_doc(res)

@router.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str, current_user: dict = Depends(get_current_user)):
    runs_repo = get_repo("runs")
    run = runs_repo.get_by_id(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    runs_repo.update(run_id, {"status": "cancelled", "progress": 1.0})
    return {"message": "Run cancelled successfully."}

@router.get("/r0")
def preview_r0(
    pathogen_id: str,
    contact_matrix_id: str,
    population_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    path = get_repo("pathogens").get_by_id(pathogen_id)
    mat = get_repo("contact_matrices").get_by_id(contact_matrix_id)
    if not path or not mat:
        raise HTTPException(status_code=404, detail="Pathogen or Contact Matrix not found")

    raw_layers = mat.get("layers", {})
    layers = [np.array(m, dtype=float) for m in raw_layers.values()]
    C_base = sum(layers) if layers else np.ones((5, 5))
    G = C_base.shape[0]

    gamma = 1.0 / max(0.1, float(path.get("infectious_period_days", 5.0)))
    p_asym = float(path.get("asymptomatic_fraction", 0.3))
    rho = float(path.get("relative_infectiousness_asym", 0.5))
    h_rates = np.zeros(G, dtype=float)

    target_r0 = float(path.get("r0", 2.5))
    q = calibrate_q_for_r0(target_r0, C_base, p_asym, rho, gamma, h_rates)
    K = compute_next_generation_matrix(C_base, p_asym, rho, gamma, h_rates, q=q)
    calculated_r0 = compute_spectral_radius(K)

    return {
        "target_r0": target_r0,
        "calibrated_q": round(q, 6),
        "spectral_radius_r0": round(calculated_r0, 4),
        "herd_immunity_threshold": round(1.0 - (1.0 / target_r0) if target_r0 > 1 else 0.0, 4),
        "matrix_size": f"{G}x{G}"
    }
