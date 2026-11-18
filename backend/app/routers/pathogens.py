from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import PathogenCreate, PathogenOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user

router = APIRouter(prefix="/pathogens", tags=["Pathogens"])

@router.get("", response_model=List[PathogenOut])
def list_pathogens(current_user: dict = Depends(get_current_user)):
    repo = get_repo("pathogens")
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    query = {} if is_admin else {"$or": [{"owner_id": user_id}, {"is_shared": True}]}
    return repo.list(query, limit=200)

@router.post("", response_model=PathogenOut)
def create_pathogen(pathogen_in: PathogenCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("pathogens")
    data = pathogen_in.model_dump()
    data["owner_id"] = current_user["id"]
    res = repo.create(data)
    get_audit_repo().log("CREATE", "pathogens", res["id"], user_id=current_user["id"])
    return res

@router.get("/{pathogen_id}", response_model=PathogenOut)
def get_pathogen(pathogen_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("pathogens")
    item = repo.get_by_id(pathogen_id)
    if not item:
        raise HTTPException(status_code=404, detail="Pathogen archetype not found")
    return item

@router.put("/{pathogen_id}", response_model=PathogenOut)
def update_pathogen(pathogen_id: str, pathogen_in: PathogenCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("pathogens")
    existing = repo.get_by_id(pathogen_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Pathogen archetype not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to modify this pathogen")

    updated = repo.update(pathogen_id, pathogen_in.model_dump())
    get_audit_repo().log("UPDATE", "pathogens", pathogen_id, user_id=current_user["id"])
    return updated

@router.delete("/{pathogen_id}")
def delete_pathogen(pathogen_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("pathogens")
    existing = repo.get_by_id(pathogen_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Pathogen archetype not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to delete this pathogen")

    repo.delete(pathogen_id)
    get_audit_repo().log("DELETE", "pathogens", pathogen_id, user_id=current_user["id"])
    return {"message": "Pathogen archetype deleted successfully."}
