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
    file_storage_url_prefix: str = "/storage"
    file_storage_public_base_url: str = "http://localhost:8000/storage"
    minio_endpoint: str = ""
    minio_access_key: str = ""
    minio_secret_key: str = ""
    minio_bucket: str = ""

    tts_provider: str = "doubao_v3_http_chunked"
    tts_base_url: str = "https://openspeech.bytedance.com/api/v3/tts/unidirectional"
    tts_api_key: str = ""
    tts_resource_id: str = "seed-tts-2.0"
    tts_voice_name: str = ""
    tts_audio_format: str = "mp3"
    tts_sample_rate: int = 24000
    tts_timeout_seconds: int = 120

    video_render_provider: str = "remotion"
    video_render_project_path: str = "../video-renderer"
    video_render_browser_executable: str = ""
    video_render_timeout_seconds: int = 600
    ffmpeg_binary: str = "ffmpeg"
    ffprobe_binary: str = "ffprobe"

    audit_api_base_url: str = "http://127.0.0.1:8000/api/v1"
    audit_timeout_seconds: int = 30
    run_real_video_tests: bool = False

    enable_safety_audit: bool = True
    enable_stream_output: bool = True
    enable_mock: bool = True
    cors_origins: list[str] = ["http://localhost:5173"]

    hello_algo_repo_url: str = "https://github.com/krahets/hello-algo.git"
    hello_algo_branch: str = "main"
    hello_algo_local_dir: str = "./data_sources/hello-algo"
    hello_algo_doc_language: str = "zh"
    hello_algo_code_language: str = ""
    hello_algo_code_languages: str = "all"

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
