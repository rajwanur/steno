from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


JobStatus = Literal["queued", "processing", "completed", "failed", "cancelled"]
SummaryStyle = Literal["short", "detailed", "bullet", "action_items"]


class JobCreateParams(BaseModel):
    model_name: str = "small"
    language: Optional[str] = "en"
    batch_size: int = 16
    device: str = "cpu"
    compute_type: str = "float32"
    diarization: bool = True
    summary_enabled: bool = False
    summary_style: SummaryStyle = "short"
    output_formats: List[str] = Field(default_factory=lambda: ["txt", "srt", "vtt", "json"])


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
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
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
