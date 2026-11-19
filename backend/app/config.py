from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/raise2026"
    SECRET_KEY: str = "dev-only-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    CORS_ORIGINS: str = "http://localhost:5173"
    STORAGE_DIR: str = "storage"
    MAX_UPLOAD_MB: int = 10
    ADMIN_NAME: str = "Conference Admin"
    ADMIN_EMAIL: str = "admin@raise2026.local"
    ADMIN_PASSWORD: str = "ChangeMe@123"
    ADMIN_SIGNUP_CODE: str = ""
    AUTO_CREATE_TABLES: bool = True


settings = Settings()
