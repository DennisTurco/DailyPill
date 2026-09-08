from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "DailyPill"
    API_PORT: int = 8420
    DATABASE_URL: str = f"sqlite:///{(DATA_DIR / 'dailypill.db').as_posix()}"
    USE_POSTGRES: bool = False

    POSTGRES_DB: str = "dailypill"
    POSTGRES_USER: str = "dailypill"
    POSTGRES_PASSWORD: str = "dailypill123"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1"
    OLLAMA_TIMEOUT_SECONDS: int = 60

    TOPICS_SEED_DIR: Path = BACKEND_DIR.parent / "topics"

    def resolved_database_url(self) -> str:
        if self.USE_POSTGRES:
            return (
                f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self.DATABASE_URL


settings = Settings()
