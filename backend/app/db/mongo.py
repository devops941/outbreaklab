import logging
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.config import settings

logger = logging.getLogger("outbreaklab.mongo")

_client: Optional[MongoClient] = None

def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        try:
            _client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS,
                retryWrites=True,
                w="majority"
            )
        except Exception as e:
            logger.error(f"Failed to initialize MongoClient: {e}")
            raise
    return _client

def get_database(db_name: Optional[str] = None) -> Database:
    client = get_mongo_client()
    target_name = db_name or settings.MONGODB_DB_NAME
    return client[target_name]

def ping_database() -> bool:
    try:
        client = get_mongo_client()
        client.admin.command("ping")
        return True
    except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
        logger.warning(f"MongoDB ping failed: {e}")
        return False

def ensure_indexes(db: Optional[Database] = None) -> None:
    if db is None:
        db = get_database()
    try:
        # Users
        db.users.create_index("email", unique=True)
        # Scenarios
        db.scenarios.create_index("owner_id")
        db.scenarios.create_index("updated_at")
        # Runs
        db.runs.create_index("scenario_id")
        db.runs.create_index("owner_id")
        db.runs.create_index("created_at")
        # Run results
        db.run_results.create_index("run_id", unique=True)
        # Datasets
        db.populations.create_index("name")
        db.pathogens.create_index("name")
        db.contact_matrices.create_index("name")
        db.interventions.create_index("name")
        db.case_reports.create_index("name")
        # Briefs & Reports
        db.briefs.create_index("owner_id")
        db.audit_log.create_index("timestamp")
        logger.info("MongoDB indexes verified successfully.")
    except Exception as e:
        logger.warning(f"Failed to ensure indexes: {e}")

def close_mongo_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
