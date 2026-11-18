from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import SensitivityRequest, SensitivityOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user
from app.sim.sensitivity import run_sensitivity_analysis

router = APIRouter(prefix="", tags=["Sensitivity"])

@router.post("/sensitivity", response_model=SensitivityOut)
def run_sensitivity(req: SensitivityRequest, current_user: dict = Depends(get_current_user)):
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

    res = run_sensitivity_analysis(
        population=pop,
        base_pathogen=path,
        contact_matrix=mat,
        base_interventions=interventions,
        target_metric=req.target_metric,
        method=req.method,
        samples=req.samples,
        seed=scen.get("seed", 42)
    )

    get_repo("sensitivity_analyses").create({
        "scenario_id": req.scenario_id,
        "owner_id": current_user["id"],
        "request": req.model_dump(),
        "result": res
    })
    get_audit_repo().log("SENSITIVITY_RUN", "sensitivity_analyses", req.scenario_id, user_id=current_user["id"])

    return res
