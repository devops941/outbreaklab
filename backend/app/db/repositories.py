import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId
from pymongo.database import Database
from app.db.mongo import get_database

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    if "_id" in doc:
        if isinstance(doc["_id"], ObjectId):
            doc["id"] = str(doc["_id"])
        else:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

class BaseRepository:
    def __init__(self, collection_name: str, db: Optional[Database] = None):
        self.collection_name = collection_name
        self._db = db

    @property
    def db(self) -> Database:
        return self._db if self._db is not None else get_database()

    @property
    def col(self):
        return self.db[self.collection_name]

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        data = data.copy()
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
        data["_id"] = data["id"]
        data["created_at"] = data.get("created_at") or now_iso()
        data["updated_at"] = data.get("updated_at") or now_iso()
        self.col.insert_one(data)
        return serialize_doc(data)

    def get_by_id(self, item_id: str) -> Optional[Dict[str, Any]]:
        doc = self.col.find_one({"_id": item_id}) or self.col.find_one({"id": item_id})
        return serialize_doc(doc)

    def list(self, filter_query: Optional[Dict[str, Any]] = None, limit: int = 100, skip: int = 0, sort_by: str = "updated_at", sort_desc: bool = True) -> List[Dict[str, Any]]:
        query = filter_query or {}
        direction = -1 if sort_desc else 1
        cursor = self.col.find(query).sort(sort_by, direction).skip(skip).limit(limit)
        return [serialize_doc(d) for d in cursor]

    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates = updates.copy()
        updates["updated_at"] = now_iso()
        if "_id" in updates:
            del updates["_id"]
        if "id" in updates:
            del updates["id"]
        res = self.col.find_one_and_update(
            {"$or": [{"_id": item_id}, {"id": item_id}]},
            {"$set": updates},
            return_document=True
        )
        return serialize_doc(res)

    def delete(self, item_id: str) -> bool:
        res = self.col.delete_one({"$or": [{"_id": item_id}, {"id": item_id}]})
        return res.deleted_count > 0

    def count(self, filter_query: Optional[Dict[str, Any]] = None) -> int:
        return self.col.count_documents(filter_query or {})

class AuditLogRepository(BaseRepository):
    def __init__(self, db: Optional[Database] = None):
        super().__init__("audit_log", db)

    def log(self, action: str, entity_type: str, entity_id: str, user_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.create({
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "user_id": user_id or "system",
            "details": details or {},
            "timestamp": now_iso()
        })

class UsersRepository(BaseRepository):
    def __init__(self, db: Optional[Database] = None):
        super().__init__("users", db)

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        doc = self.col.find_one({"email": email.strip().lower()})
        return serialize_doc(doc)

# Factory instances
def get_users_repo(db: Optional[Database] = None) -> UsersRepository:
    return UsersRepository(db)

def get_repo(collection: str, db: Optional[Database] = None) -> BaseRepository:
    return BaseRepository(collection, db)

def get_audit_repo(db: Optional[Database] = None) -> AuditLogRepository:
    return AuditLogRepository(db)
