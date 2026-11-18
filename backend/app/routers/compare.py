from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import CompareRequest, CompareOut, ScenarioComparisonItem
from app.db.repositories import get_repo
from app.deps import get_current_user

router = APIRouter(prefix="", tags=["Scenario Comparison"])

@router.post("/compare", response_model=CompareOut)
def compare_runs(req: CompareRequest, current_user: dict = Depends(get_current_user)):
    runs_repo = get_repo("runs")

    baseline_run = runs_repo.get_by_id(req.baseline_run_id)
    if not baseline_run or not baseline_run.get("metrics"):
        raise HTTPException(status_code=404, detail="Baseline run or its metrics were not found")

    b_metrics = baseline_run["metrics"]
    b_deaths = b_metrics.get("total_deaths", 0)
    b_cost = b_metrics.get("total_cost", 0.0)

    comparison_items: List[ScenarioComparisonItem] = []
    points_for_pareto = []

    all_run_ids = [req.baseline_run_id] + [rid for rid in req.comparison_run_ids if rid != req.baseline_run_id]

    for rid in all_run_ids:
        r = runs_repo.get_by_id(rid)
        if not r or not r.get("metrics"):
            continue

        m = r["metrics"]
        deaths = m.get("total_deaths", 0)
        cost = m.get("total_cost", 0.0)
        deaths_averted = max(0, b_deaths - deaths)
        delta_cost = cost - b_cost

        # Calculate deltas vs baseline
        delta = {
            "delta_deaths": deaths - b_deaths,
            "deaths_averted": deaths_averted,
            "delta_cost": delta_cost,
            "delta_peak_hosp": m.get("peak_hospital_occupancy", 0) - b_metrics.get("peak_hospital_occupancy", 0),
            "delta_attack_rate": round(m.get("overall_attack_rate", 0.0) - b_metrics.get("overall_attack_rate", 0.0), 4)
        }

        points_for_pareto.append({
            "run_id": rid,
            "scenario_name": r.get("scenario_name", "Scenario"),
            "cost": cost,
            "deaths_averted": deaths_averted,
            "deaths": deaths,
            "attack_rate": m.get("overall_attack_rate", 0.0)
        })

        comparison_items.append(ScenarioComparisonItem(
            run_id=rid,
            scenario_name=r.get("scenario_name", "Scenario"),
            engine=r.get("engine", "ode"),
            metrics=m,
            delta_vs_baseline=delta,
            is_pareto_optimal=False
        ))

    # Identify Pareto Frontier (minimize Cost, maximize Deaths Averted)
    # A point A dominates point B if cost(A) <= cost(B) and averted(A) >= averted(B) with at least one strict inequality.
    pareto_set = []
    for i, p_i in enumerate(points_for_pareto):
        dominated = False
        for j, p_j in enumerate(points_for_pareto):
            if i != j:
                if (p_j["cost"] <= p_i["cost"] and p_j["deaths_averted"] >= p_i["deaths_averted"]) and (p_j["cost"] < p_i["cost"] or p_j["deaths_averted"] > p_i["deaths_averted"]):
                    dominated = True
                    break
        if not dominated:
            pareto_set.append(p_i)
            # Mark in item
            for item in comparison_items:
                if item.run_id == p_i["run_id"]:
                    item.is_pareto_optimal = True

    # Sort leaderboard by total_deaths ascending (fewer deaths = better)
    comparison_items.sort(key=lambda x: x.metrics.total_deaths)

    return CompareOut(
        baseline_run_id=req.baseline_run_id,
        ranked_leaderboard=comparison_items,
        pareto_frontier=pareto_set
    )
