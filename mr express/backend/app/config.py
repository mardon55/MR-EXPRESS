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
    webapp_url: str = "https://543c8039-3a43-4749-afb5-891bd98f2748-3000-21eqn5rvuhafb.sisko.replit.dev"
    sqlite_path: str = "data/mrexpress.db"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    @property
    def webapp_url_valid(self) -> bool:
        return self.webapp_url.startswith("https://")


settings = Settings()
