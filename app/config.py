from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    app_name: str = "Steno"
    app_version: str = "0.1.0"
    app_license: str = "MIT"
    app_description: str = "WhisperX-powered transcription and summary workspace."
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_reload: bool = False

    storage_dir: Path = Path("storage")
    uploads_dir: Path = Path("storage/uploads")
    jobs_dir: Path = Path("storage/jobs")

    max_upload_size_mb: int = 2048
    ffmpeg_binary: str = "ffmpeg"

    default_model: str = "small"
    default_language: str = "en"
    default_batch_size: int = 16
    default_device: str = "auto"
    compute_type: str = "float32"

    whisperx_models: List[str] = Field(
        default_factory=lambda: [
            "tiny",
            "base",
            "small",
            "medium",
            "large-v2",
            "large-v3",
        ]
    )

    supported_output_formats: List[str] = Field(
        default_factory=lambda: ["txt", "srt", "vtt", "tsv", "json"]
    )

    llm_api_base: str | None = None
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"

    hf_token: str | None = None

    app_technologies: List[str] = Field(
        default_factory=lambda: [
            "FastAPI",
            "WhisperX",
            "Tailwind CSS",
            "OpenAI-compatible API",
            "FFmpeg",
        ]
    )


settings = Settings()
