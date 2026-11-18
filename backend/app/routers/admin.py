import time
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.db.repositories import get_repo, get_users_repo, get_audit_repo
from app.db.mongo import ping_database
from app.deps import get_current_admin
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin Console"])

START_TIME = time.time()

@router.get("/system")
def get_system_status(current_admin: dict = Depends(get_current_admin)):
    is_db_connected = ping_database()
    collections = [
        "users", "populations", "pathogens", "contact_matrices",
        "interventions", "scenarios", "runs", "briefs", "case_reports", "audit_log"
    ]
    counts = {}
    for col_name in collections:
        counts[col_name] = get_repo(col_name).count()

    uptime_sec = int(time.time() - START_TIME)
    return {
        "status": "healthy" if is_db_connected else "degraded",
        "mongodb_connected": is_db_connected,
        "database_name": settings.MONGODB_DB_NAME,
        "uptime_seconds": uptime_sec,
        "counts": counts,
        "environment": settings.APP_ENV
    }

@router.get("/users")
def list_all_users(current_admin: dict = Depends(get_current_admin)):
    users_repo = get_users_repo()
    all_users = users_repo.list(limit=200)
    for u in all_users:
        if "password_hash" in u:
            del u["password_hash"]
    return all_users

@router.get("/audit")
def list_audit_trail(limit: int = 100, current_admin: dict = Depends(get_current_admin)):
    audit_repo = get_audit_repo()
    return audit_repo.list(limit=limit, sort_by="timestamp", sort_desc=True)

@router.post("/users/{user_id}/role")
def update_user_role(user_id: str, payload: Dict[str, str], current_admin: dict = Depends(get_current_admin)):
    new_role = payload.get("role")
    if new_role not in ["analyst", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'analyst' or 'admin'.")

    users_repo = get_users_repo()
    user = users_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    updated = users_repo.update(user_id, {"role": new_role})
    get_audit_repo().log("USER_ROLE_CHANGE", "users", user_id, user_id=current_admin["id"], details={"new_role": new_role})
    return {"message": f"User role updated to {new_role}."}
