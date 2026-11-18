from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import InterventionCreate, InterventionOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user

router = APIRouter(prefix="/interventions", tags=["Interventions"])

@router.get("", response_model=List[InterventionOut])
def list_interventions(current_user: dict = Depends(get_current_user)):
    repo = get_repo("interventions")
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    query = {} if is_admin else {"$or": [{"owner_id": user_id}, {"is_shared": True}]}
    return repo.list(query, limit=200)

@router.post("", response_model=InterventionOut)
def create_intervention(inv_in: InterventionCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("interventions")
    data = inv_in.model_dump()
    data["owner_id"] = current_user["id"]
    res = repo.create(data)
    get_audit_repo().log("CREATE", "interventions", res["id"], user_id=current_user["id"])
    return res

@router.get("/{inv_id}", response_model=InterventionOut)
def get_intervention(inv_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("interventions")
    item = repo.get_by_id(inv_id)
    if not item:
        raise HTTPException(status_code=404, detail="Intervention not found")
    return item

@router.put("/{inv_id}", response_model=InterventionOut)
def update_intervention(inv_id: str, inv_in: InterventionCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("interventions")
    existing = repo.get_by_id(inv_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Intervention not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to modify this intervention")

    updated = repo.update(inv_id, inv_in.model_dump())
    get_audit_repo().log("UPDATE", "interventions", inv_id, user_id=current_user["id"])
    return updated

@router.delete("/{inv_id}")
def delete_intervention(inv_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("interventions")
    existing = repo.get_by_id(inv_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Intervention not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to delete this intervention")

    repo.delete(inv_id)
    get_audit_repo().log("DELETE", "interventions", inv_id, user_id=current_user["id"])
    return {"message": "Intervention deleted successfully."}
