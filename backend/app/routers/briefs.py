from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import BriefCreate, BriefOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user

router = APIRouter(prefix="/briefs", tags=["Policy Briefs"])

@router.get("", response_model=List[BriefOut])
def list_briefs(current_user: dict = Depends(get_current_user)):
    repo = get_repo("briefs")
    is_admin = current_user.get("role") == "admin"
    query = {} if is_admin else {"owner_id": current_user["id"]}
    return repo.list(query, limit=100)

@router.post("", response_model=BriefOut)
def create_brief(brief_in: BriefCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("briefs")
    data = brief_in.model_dump()
    data["owner_id"] = current_user["id"]
    res = repo.create(data)
    get_audit_repo().log("CREATE", "briefs", res["id"], user_id=current_user["id"])
    return res

@router.get("/{brief_id}", response_model=BriefOut)
def get_brief(brief_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("briefs")
    item = repo.get_by_id(brief_id)
    if not item:
        raise HTTPException(status_code=404, detail="Policy brief not found")
    return item

@router.put("/{brief_id}", response_model=BriefOut)
def update_brief(brief_id: str, brief_in: BriefCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("briefs")
    existing = repo.get_by_id(brief_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Policy brief not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to modify this brief")

    updated = repo.update(brief_id, brief_in.model_dump())
    get_audit_repo().log("UPDATE", "briefs", brief_id, user_id=current_user["id"])
    return updated

@router.delete("/{brief_id}")
def delete_brief(brief_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("briefs")
    existing = repo.get_by_id(brief_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Policy brief not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to delete this brief")

    repo.delete(brief_id)
    get_audit_repo().log("DELETE", "briefs", brief_id, user_id=current_user["id"])
    return {"message": "Policy brief deleted successfully."}
