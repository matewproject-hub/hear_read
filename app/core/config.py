from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "hear_read"
    API_V1_STR: str = "/api/v1"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str

    # Database (Supabase Postgres)
    DATABASE_URL: str

    # CORS — set in .env as a comma-separated list, e.g.:
    #   ALLOWED_ORIGINS=chrome-extension://abcdefghijklmnopabcdefghijklmnop,http://localhost
    ALLOWED_ORIGINS: List[str] = []

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
