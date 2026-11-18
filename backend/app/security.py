import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
import bcrypt
import jwt
from app.config import settings

# In-memory tracking of failed login attempts: {email: (fail_count, lockout_until_timestamp)}
_login_attempts: Dict[str, Tuple[int, float]] = {}

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def check_login_lockout(email: str) -> Tuple[bool, Optional[int]]:
    now = time.time()
    if email in _login_attempts:
        fails, lockout_until = _login_attempts[email]
        if lockout_until > now:
            minutes_left = int((lockout_until - now) / 60) + 1
            return True, minutes_left
        elif lockout_until > 0 and lockout_until <= now:
            # Lockout expired, reset
            del _login_attempts[email]
    return False, None

def record_failed_login(email: str) -> Tuple[int, bool]:
    now = time.time()
    fails, lockout_until = _login_attempts.get(email, (0, 0.0))
    fails += 1
    locked = False
    if fails >= settings.MAX_FAILED_LOGINS:
        lockout_until = now + (settings.LOCKOUT_MINUTES * 60)
        locked = True
    _login_attempts[email] = (fails, lockout_until)
    return fails, locked

def record_successful_login(email: str) -> None:
    if email in _login_attempts:
        del _login_attempts[email]

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_MINUTES)
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_DAYS)
    to_encode.update({"exp": expire, "iat": now, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")
