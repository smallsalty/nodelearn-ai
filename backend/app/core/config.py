from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NodeLearn AI"
    app_env: str = "development"
    app_port: int = 8000
    app_version: str = "0.1.0"

    database_url: str = ""
    redis_url: str = ""

    jwt_secret: str = ""
    jwt_expire_minutes: int = 1440

    llm_provider: str = ""
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model_name: str = ""

    embedding_provider: str = ""
    embedding_api_key: str = ""
    embedding_model_name: str = ""

    vector_store_type: str = "chroma"
    vector_store_url: str = ""

    graph_db_type: str = "neo4j"
    neo4j_uri: str = ""
    neo4j_username: str = ""
    neo4j_password: str = ""

    file_storage_type: str = "local"
    file_storage_path: str = "./storage"
    minio_endpoint: str = ""
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = ""

    enable_safety_audit: bool = True
    enable_stream_output: bool = True
    enable_mock: bool = True
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
