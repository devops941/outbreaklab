import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH) if ENV_PATH.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    MONGODB_URI: str = Field(..., description="MongoDB Atlas connection string")
    MONGODB_DB_NAME: str = "outbreaklab"
    MONGODB_TEST_DB_NAME: str = "outbreaklab_test"
    MONGODB_TIMEOUT_MS: int = 8000

    JWT_SECRET: str = Field(..., description="JWT signing secret key")
    JWT_ACCESS_MINUTES: int = 60
    JWT_REFRESH_DAYS: int = 7
    MAX_FAILED_LOGINS: int = 5
    LOCKOUT_MINUTES: int = 15

    ADMIN_EMAIL: str = "admin@outbreaklab.local"
    ADMIN_PASSWORD: str = "AdminOutbreakLab2026!"

    SIM_DEFAULT_SEED: int = 42
    SIM_MAX_DAYS: int = 730
    SIM_DEFAULT_MC_RUNS: int = 500
    SIM_MAX_MC_RUNS: int = 5000
    SENS_DEFAULT_SAMPLES: int = 500
    SIM_JOB_TIMEOUT_SEC: int = 300

    REPORT_DIR: str = "outputs/reports"
    UPLOAD_DIR: str = "data/uploads"
    MAX_UPLOAD_MB: int = 15

    @field_validator("MONGODB_URI")
    @classmethod
    def validate_mongodb_uri(cls, v: str) -> str:
        if not v or "change-me" in v or "<db_user>" in v:
            raise ValueError("MONGODB_URI must be set to a valid connection string and cannot contain placeholder values.")
        return v

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or "change-me" in v:
            raise ValueError("JWT_SECRET must be set and cannot be the default placeholder.")
        if len(v) < 16:
            raise ValueError("JWT_SECRET must be at least 16 characters long for security.")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
