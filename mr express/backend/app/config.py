from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

_DEFAULT_WEBAPP_URL = "https://075281ae-6f02-40ef-8c9c-03b5bf66f2f4-00-28tt0515h973f.pike.replit.dev/shop/"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bot_token: str = ""
    webapp_url: str = _DEFAULT_WEBAPP_URL
    sqlite_path: str = "data/mrexpress.db"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    @field_validator("webapp_url")
    @classmethod
    def validate_webapp_url(cls, v: str) -> str:
        if not v.startswith("http"):
            return _DEFAULT_WEBAPP_URL
        return v

    @property
    def webapp_url_valid(self) -> bool:
        return self.webapp_url.startswith("https://")


settings = Settings()
