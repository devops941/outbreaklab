import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.db.repositories import get_users_repo, get_audit_repo
from app.security import hash_password

def create_admin():
    print(f"Connecting to database: {settings.MONGODB_DB_NAME}...")
    repo = get_users_repo()
    email = settings.ADMIN_EMAIL.lower().strip()
    existing = repo.get_by_email(email)

    if existing:
        print(f"Admin user already exists with email: {email}")
        return existing

    admin_data = {
        "email": email,
        "password_hash": hash_password(settings.ADMIN_PASSWORD),
        "full_name": "OutbreakLab Administrator",
        "role": "admin"
    }
    user = repo.create(admin_data)
    get_audit_repo().log("CREATE_ADMIN", "users", user["id"], user_id="system")
    print(f"Admin user created successfully! ID: {user['id']}, Email: {email}")
    return user

if __name__ == "__main__":
    create_admin()
