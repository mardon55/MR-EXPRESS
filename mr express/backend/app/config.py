from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bot_token: str = ""
    webapp_url: str = "https://c4b3ed98-19d8-4ae3-a088-a22da62fb8c1-00-g4tsd5fc7ysl.pike.replit.dev"
    sqlite_path: str = "data/mrexpress.db"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    @property
    def webapp_url_valid(self) -> bool:
        return self.webapp_url.startswith("https://")


settings = Settings()
