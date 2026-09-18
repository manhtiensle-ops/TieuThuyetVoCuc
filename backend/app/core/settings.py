from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "Novel Platform API"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-32chars-min"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # DB
    DATABASE_URL: str = "postgresql+asyncpg://novel:novel@localhost:5432/novel_platform"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "https://novel-platform.com"]

    # Rate limit (requests per minute)
    RATE_LIMIT_RPM: int = 60

settings = Settings()