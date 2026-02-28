from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from app.core.summary_prompts import default_summary_prompt_templates


JobStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]
SummaryStyle = str


class JobCreateParams(BaseModel):
    model_name: str = "small"
    language: Optional[str] = "en"
    batch_size: int = 16
    device: str = "cpu"
    compute_type: str = "float32"
    diarization: bool = True
    summary_enabled: bool = False
    summary_style: SummaryStyle = "short"
    retain_source_files: bool = True
    retain_processed_audio: bool = True
    retain_export_files: bool = True
    output_formats: List[str] = Field(default_factory=lambda: ["txt", "srt", "vtt", "json"])
    speaker_name_overrides: Dict[str, str] = Field(default_factory=dict)


class JobResult(BaseModel):
    transcript: Optional[str] = None
    segments: List[Dict[str, Any]] = Field(default_factory=list)
    language: Optional[str] = None
    summary: Optional[str] = None
    summaries: Dict[str, str] = Field(default_factory=dict)
    generated_files: Dict[str, str] = Field(default_factory=dict)


class JobState(BaseModel):
    id: str
    filename: str
    source_path: str
    audio_path: str
    file_type: Literal["audio", "video"]
    status: JobStatus = "queued"
    progress: int = 0
    step: str = "queued"
    error: Optional[str] = None
    events: List[str] = Field(default_factory=list)
    cancel_requested: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    params: JobCreateParams
    result: JobResult = Field(default_factory=JobResult)


class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus


class JobStatusResponse(BaseModel):
    id: str
    filename: str
    file_type: Literal["audio", "video"]
    status: JobStatus
    progress: int
    step: str
    error: Optional[str] = None
    events: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    params: JobCreateParams
    result: JobResult


class SummaryRequest(BaseModel):
    style: SummaryStyle = "short"
    speaker_name_overrides: Dict[str, str] = Field(default_factory=dict)


class QueueControlResponse(BaseModel):
    message: str


class JobListItem(BaseModel):
    id: str
    filename: str
    file_type: Literal["audio", "video"]
    status: JobStatus
    progress: int
    step: str
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class GlobalSettings(BaseModel):
    default_model: str = "small"
    default_language: Optional[str] = "en"
    default_batch_size: int = 16
    default_device: str = "auto"
    compute_type: str = "float32"
    llm_api_base: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model: str = "gpt-4o-mini"
    retain_source_files: bool = True
    retain_processed_audio: bool = True
    retain_export_files: bool = True
    summary_prompt_templates: Dict[str, str] = Field(
        default_factory=default_summary_prompt_templates
    )
    hf_token: Optional[str] = None
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_reload: bool = False


class GlobalSettingsUpdate(BaseModel):
    default_model: Optional[str] = None
    default_language: Optional[str] = None
    default_batch_size: Optional[int] = None
    default_device: Optional[str] = None
    compute_type: Optional[str] = None
    llm_api_base: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    retain_source_files: Optional[bool] = None
    retain_processed_audio: Optional[bool] = None
    retain_export_files: Optional[bool] = None
    summary_prompt_templates: Optional[Dict[str, str]] = None
    hf_token: Optional[str] = None
    app_host: Optional[str] = None
    app_port: Optional[int] = None
    app_reload: Optional[bool] = None
