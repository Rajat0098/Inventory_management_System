from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    database_url: str = Field("postgresql://postgres:postgres@db:5432/inventory_db", validation_alias="DATABASE_URL")
    postgres_user: str = Field("postgres", validation_alias="POSTGRES_USER")
    postgres_password: str = Field("postgres", validation_alias="POSTGRES_PASSWORD")
    postgres_db: str = Field("inventory_db", validation_alias="POSTGRES_DB")
    postgres_host: str = Field("db", validation_alias="POSTGRES_HOST")
    postgres_port: str = Field("5432", validation_alias="POSTGRES_PORT")
    backend_port: int = Field(8000, validation_alias="BACKEND_PORT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
