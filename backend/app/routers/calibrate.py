from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import CalibrationRequest, CalibrationOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user
from app.sim.calibrate import fit_model_to_case_reports

router = APIRouter(prefix="", tags=["Calibration"])

@router.post("/calibrate", response_model=CalibrationOut)
def run_calibration(req: CalibrationRequest, current_user: dict = Depends(get_current_user)):
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

    res = fit_model_to_case_reports(
        population=pop,
        base_pathogen=path,
        contact_matrix=mat,
        interventions=interventions,
        case_reports=[c.model_dump() for c in req.case_reports],
        days_to_fit=req.days_to_fit
    )

    get_repo("calibrations").create({
        "scenario_id": req.scenario_id,
        "owner_id": current_user["id"],
        "result": res
    })
    get_audit_repo().log("CALIBRATE_FIT", "calibrations", req.scenario_id, user_id=current_user["id"])

    return res
