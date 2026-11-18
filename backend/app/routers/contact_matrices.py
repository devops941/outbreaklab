import numpy as np
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.all_schemas import ContactMatrixCreate, ContactMatrixOut
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user

router = APIRouter(prefix="/contact-matrices", tags=["Contact Matrices"])

@router.get("", response_model=List[ContactMatrixOut])
def list_contact_matrices(current_user: dict = Depends(get_current_user)):
    repo = get_repo("contact_matrices")
    user_id = current_user["id"]
    is_admin = current_user.get("role") == "admin"
    query = {} if is_admin else {"$or": [{"owner_id": user_id}, {"is_shared": True}]}
    return repo.list(query, limit=200)

@router.post("", response_model=ContactMatrixOut)
def create_contact_matrix(matrix_in: ContactMatrixCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("contact_matrices")
    data = matrix_in.model_dump()
    data["owner_id"] = current_user["id"]
    res = repo.create(data)
    get_audit_repo().log("CREATE", "contact_matrices", res["id"], user_id=current_user["id"])
    return res

@router.get("/{matrix_id}", response_model=ContactMatrixOut)
def get_contact_matrix(matrix_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("contact_matrices")
    item = repo.get_by_id(matrix_id)
    if not item:
        raise HTTPException(status_code=404, detail="Contact matrix not found")
    return item

@router.put("/{matrix_id}", response_model=ContactMatrixOut)
def update_contact_matrix(matrix_id: str, matrix_in: ContactMatrixCreate, current_user: dict = Depends(get_current_user)):
    repo = get_repo("contact_matrices")
    existing = repo.get_by_id(matrix_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact matrix not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to modify this contact matrix")

    updated = repo.update(matrix_id, matrix_in.model_dump())
    get_audit_repo().log("UPDATE", "contact_matrices", matrix_id, user_id=current_user["id"])
    return updated

@router.post("/{matrix_id}/balance")
def auto_balance_matrix(matrix_id: str, payload: Optional[Dict[str, Any]] = None, current_user: dict = Depends(get_current_user)):
    """
    Applies reciprocity balance: C_ij * N_i = C_ji * N_j
    C_ij_balanced = (C_ij * N_i + C_ji * N_j) / (2 * N_i)
    """
    repo = get_repo("contact_matrices")
    existing = repo.get_by_id(matrix_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact matrix not found")

    population_id = payload.get("population_id") if payload else None
    N_vec = None
    if population_id:
        pop = get_repo("populations").get_by_id(population_id)
        if pop and "age_groups" in pop:
            N_vec = np.array([ag["count"] for ag in pop["age_groups"]], dtype=float)

    layers = existing.get("layers", {})
    balanced_layers = {}

    for layer_name, mat_list in layers.items():
        mat = np.array(mat_list, dtype=float)
        G = mat.shape[0]
        bal_mat = np.zeros_like(mat)

        if N_vec is not None and len(N_vec) == G:
            for i in range(G):
                for j in range(G):
                    bal_mat[i, j] = (mat[i, j] * N_vec[i] + mat[j, i] * N_vec[j]) / (2.0 * max(1.0, N_vec[i]))
        else:
            # Symmetrical mean
            bal_mat = 0.5 * (mat + mat.T)

        balanced_layers[layer_name] = np.round(bal_mat, 4).tolist()

    updated = repo.update(matrix_id, {"layers": balanced_layers})
    get_audit_repo().log("BALANCE_RECIPROCITY", "contact_matrices", matrix_id, user_id=current_user["id"])
    return {"message": "Contact matrix reciprocity balanced successfully", "layers": balanced_layers}

@router.delete("/{matrix_id}")
def delete_contact_matrix(matrix_id: str, current_user: dict = Depends(get_current_user)):
    repo = get_repo("contact_matrices")
    existing = repo.get_by_id(matrix_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Contact matrix not found")
    if existing.get("owner_id") != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Permission denied to delete this contact matrix")

    repo.delete(matrix_id)
    get_audit_repo().log("DELETE", "contact_matrices", matrix_id, user_id=current_user["id"])
    return {"message": "Contact matrix deleted successfully."}
