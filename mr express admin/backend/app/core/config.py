from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_PROJECT_ROOT = _BACKEND_ROOT.parent.parent / "mr express" / "backend"
_DEFAULT_DB = _PROJECT_ROOT / "data" / "mrexpress.db"
_DEFAULT_UPLOADS = _PROJECT_ROOT / "uploads"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mr_express"
    sqlite_path: str = str(_DEFAULT_DB)
    uploads_dir: str = str(_DEFAULT_UPLOADS)
    secret_key: str = "dev-secret-key"
    cors_origins: list[str] = ["http://localhost:5174"]


settings = Settings()
