from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import ScenarioCreate, ScenarioOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

@router.get("", response_model=List[ScenarioOut])
def list_scenarios(current_user: dict = Depends(get_current_user)):
    repo = get_repo("scenarios")
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    query = {} if is_admin else {"owner_id": user_id}
    return repo.list(query, limit=100)

@router.post("", response_model=ScenarioOut)
def create_scenario(scen_in: ScenarioCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("scenarios")
    data = scen_in.model_dump()
    data["owner_id"] = current_user["id"]
    res = repo.create(data)
    get_audit_repo().log("CREATE", "scenarios", res["id"], user_id=current_user["id"])
    return res

@router.get("/{scen_id}", response_model=ScenarioOut)
def get_scenario(scen_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("scenarios")
    item = repo.get_by_id(scen_id)
    if not item:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return item

@router.put("/{scen_id}", response_model=ScenarioOut)
def update_scenario(scen_id: str, scen_in: ScenarioCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("scenarios")
    existing = repo.get_by_id(scen_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to modify this scenario")

    updated = repo.update(scen_id, scen_in.model_dump())
    get_audit_repo().log("UPDATE", "scenarios", scen_id, user_id=current_user["id"])
    return updated

@router.post("/{scen_id}/duplicate", response_model=ScenarioOut)
def duplicate_scenario(scen_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("scenarios")
    existing = repo.get_by_id(scen_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Scenario not found")

    clone_data = dict(existing)
    del clone_data["id"]
    clone_data["name"] = f"{existing.get('name', 'Scenario')} (Copy)"
    clone_data["owner_id"] = current_user["id"]
    res = repo.create(clone_data)
    get_audit_repo().log("DUPLICATE", "scenarios", res["id"], user_id=current_user["id"])
    return res

@router.delete("/{scen_id}")
def delete_scenario(scen_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("scenarios")
    existing = repo.get_by_id(scen_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Scenario not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to delete this scenario")

    repo.delete(scen_id)
    get_audit_repo().log("DELETE", "scenarios", scen_id, user_id=current_user["id"])
    return {"message": "Scenario deleted successfully."}
