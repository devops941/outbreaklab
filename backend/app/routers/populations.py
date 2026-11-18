from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.all_schemas import PopulationCreate, PopulationOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user

router = APIRouter(prefix="/populations", tags=["Populations"])

@router.get("", response_model=List[PopulationOut])
def list_populations(current_user: dict = Depends(get_current_user)):
    repo = get_repo("populations")
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    query = {} if is_admin else {"$or": [{"owner_id": user_id}, {"is_shared": True}]}
    return repo.list(query, limit=200)

@router.post("", response_model=PopulationOut)
def create_population(pop_in: PopulationCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("populations")
    audit = get_audit_repo()
    doc_data = pop_in.model_dump()
    doc_data["owner_id"] = current_user["id"]
    res = repo.create(doc_data)
    audit.log("CREATE", "populations", res["id"], user_id=current_user["id"])
    return res

@router.get("/{pop_id}", response_model=PopulationOut)
def get_population(pop_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("populations")
    pop = repo.get_by_id(pop_id)
    if not pop:
        raise HTTPException(status_code=404, detail="Population dataset not found")
    return pop

@router.put("/{pop_id}", response_model=PopulationOut)
def update_population(pop_id: str, pop_in: PopulationCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("populations")
    existing = repo.get_by_id(pop_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Population dataset not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to modify this dataset")

    updated = repo.update(pop_id, pop_in.model_dump())
    get_audit_repo().log("UPDATE", "populations", pop_id, user_id=current_user["id"])
    return updated

@router.delete("/{pop_id}")
def delete_population(pop_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("populations")
    existing = repo.get_by_id(pop_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Population dataset not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to delete this dataset")

    repo.delete(pop_id)
    get_audit_repo().log("DELETE", "populations", pop_id, user_id=current_user["id"])
    return {"message": "Population dataset deleted successfully."}
