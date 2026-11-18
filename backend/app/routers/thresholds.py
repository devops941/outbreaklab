from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import ThresholdRequest, ThresholdOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user
from app.sim.thresholds import find_intervention_threshold

router = APIRouter(prefix="", tags=["Thresholds"])

@router.post("/thresholds", response_model=ThresholdOut)
def run_threshold_search(req: ThresholdRequest, current_user: dict = Depends(get_current_user)):
    scen_repo = get_repo("scenarios")
    pop_repo = get_repo("populations")
    path_repo = get_repo("pathogens")
    mat_repo = get_repo("contact_matrices")
    inv_repo = get_repo("interventions")

    scen = scen_repo.get_by_id(req.scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail="Scenario not found")

    pop = pop_repo.get_by_id(scen["population_id"])
    path = path_repo.get_by_id(scen["pathogen_id"])
    mat = mat_repo.get_by_id(scen["contact_matrix_id"])
    if not pop or not path or not mat:
        raise HTTPException(status_code=400, detail="Scenario references missing datasets")

    inv_ids = scen.get("intervention_ids", [])
    interventions = [inv_repo.get_by_id(iid) for iid in inv_ids if inv_repo.get_by_id(iid)]

    res = find_intervention_threshold(
        population=pop,
        pathogen=path,
        contact_matrix=mat,
        base_interventions=interventions,
        target_metric=req.target_metric,
        target_value=req.target_value,
        parameter_to_vary=req.parameter_to_vary,
        layer_name=req.layer_name or "school",
        min_bound=req.min_bound,
        max_bound=req.max_bound,
        horizon_days=scen.get("horizon_days", 150)
    )

    get_repo("threshold_searches").create({
        "scenario_id": req.scenario_id,
        "owner_id": current_user["id"],
        "request": req.model_dump(),
        "result": res
    })
    get_audit_repo().log("THRESHOLD_SEARCH", "threshold_searches", req.scenario_id, user_id=current_user["id"])

    return res
