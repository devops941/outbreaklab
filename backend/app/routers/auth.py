from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.schemas.all_schemas import UserCreate, UserLogin, UserOut, TokenResponse, ChangePasswordRequest
from app.db.repositories import get_users_repo, get_audit_repo
from app.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    decode_token, check_login_lockout, record_failed_login, record_successful_login
)
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate):
    users_repo = get_users_repo()
    audit_repo = get_audit_repo()

    existing = users_repo.get_by_email(user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    hashed_pw = hash_password(user_in.password)
    user_data = {
        "email": user_in.email.lower().strip(),
        "password_hash": hashed_pw,
        "full_name": user_in.full_name.strip(),
        "role": user_in.role
    }
    created_user = users_repo.create(user_data)
    audit_repo.log("USER_REGISTER", "users", created_user["id"], user_id=created_user["id"])

    user_out = UserOut(
        id=created_user["id"],
        email=created_user["email"],
        full_name=created_user["full_name"],
        role=created_user["role"],
        created_at=created_user["created_at"],
        last_login=created_user.get("last_login")
    )

    access_token = create_access_token({"sub": created_user["id"], "role": created_user["role"]})
    refresh_token = create_refresh_token({"sub": created_user["id"]})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_out
    )

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin):
    email = login_in.email.lower().strip()
    is_locked, mins_left = check_login_lockout(email)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to multiple failed attempts. Try again in {mins_left} minutes."
        )

    users_repo = get_users_repo()
    audit_repo = get_audit_repo()
    user = users_repo.get_by_email(email)

    if not user or not verify_password(login_in.password, user.get("password_hash", "")):
        fails, locked = record_failed_login(email)
        audit_repo.log("LOGIN_FAILED", "users", email, details={"attempt": fails})
        if locked:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Account locked for 15 minutes."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    record_successful_login(email)
    users_repo.update(user["id"], {"last_login": user.get("updated_at")})
    audit_repo.log("LOGIN_SUCCESS", "users", user["id"], user_id=user["id"])

    user_out = UserOut(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        created_at=user["created_at"],
        last_login=user.get("last_login")
    )

    access_token = create_access_token({"sub": user["id"], "role": user["role"]})
    refresh_token = create_refresh_token({"sub": user["id"]})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_out
    )

@router.post("/refresh")
def refresh_token(payload: dict):
    r_token = payload.get("refresh_token")
    if not r_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh_token is required")
    try:
        decoded = decode_token(r_token)
        if decoded.get("type") != "refresh":
            raise ValueError("Invalid token type")
        user_id = decoded.get("sub")
        users_repo = get_users_repo()
        user = users_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        new_access = create_access_token({"sub": user["id"], "role": user["role"]})
        return {"access_token": new_access, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Refresh failed: {str(e)}")

@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        role=current_user["role"],
        created_at=current_user["created_at"],
        last_login=current_user.get("last_login")
    )

@router.post("/change-password")
def change_password(body: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if not verify_password(body.current_password, current_user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    new_hash = hash_password(body.new_password)
    users_repo = get_users_repo()
    users_repo.update(current_user["id"], {"password_hash": new_hash})
    get_audit_repo().log("PASSWORD_CHANGED", "users", current_user["id"], user_id=current_user["id"])
    return {"message": "Password updated successfully."}

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    get_audit_repo().log("USER_LOGOUT", "users", current_user["id"], user_id=current_user["id"])
    return {"message": "Successfully logged out."}
