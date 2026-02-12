from __future__ import annotations

import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import settings
from app.schemas import JobCreateParams, JobCreateResponse, JobStatusResponse
from app.services.job_service import JobService

router = APIRouter(prefix="/api", tags=["api"])


def get_job_service() -> JobService:
    from app.main import job_service

    return job_service


@router.get("/config")
def get_config() -> dict:
    return {
        "models": settings.whisperx_models,
        "formats": settings.supported_output_formats,
        "defaults": {
            "model": settings.default_model,
            "language": settings.default_language,
            "batch_size": settings.default_batch_size,
            "device": settings.default_device,
            "compute_type": settings.compute_type,
        },
    }


@router.post("/jobs", response_model=JobCreateResponse)
async def create_job(
    file: UploadFile = File(...),
    model_name: str = Form(settings.default_model),
    language: str | None = Form(settings.default_language),
    batch_size: int = Form(settings.default_batch_size),
    device: str = Form(settings.default_device),
    compute_type: str = Form(settings.compute_type),
    diarization: bool = Form(True),
    summary_enabled: bool = Form(False),
    summary_style: str = Form("short"),
    output_formats: str = Form("[\"txt\",\"srt\",\"vtt\",\"json\"]"),
    service: JobService = Depends(get_job_service),
) -> JobCreateResponse:
    try:
        selected_formats: List[str] = json.loads(output_formats)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid output_formats JSON array") from exc

    unknown = [fmt for fmt in selected_formats if fmt not in settings.supported_output_formats]
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported format(s): {unknown}")

    params = JobCreateParams(
        model_name=model_name,
        language=language,
        batch_size=batch_size,
        device=device,
        compute_type=compute_type,
        diarization=diarization,
        summary_enabled=summary_enabled,
        summary_style=summary_style,
        output_formats=selected_formats,
    )
    try:
        job_id = await service.create_job(file, params)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return JobCreateResponse(job_id=job_id, status="queued")


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str, service: JobService = Depends(get_job_service)) -> JobStatusResponse:
    try:
        job = service.get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc

    return JobStatusResponse(
        id=job.id,
        status=job.status,
        progress=job.progress,
        step=job.step,
        error=job.error,
        result=job.result,
    )


@router.get("/jobs/{job_id}/download/{fmt}")
def download(job_id: str, fmt: str, service: JobService = Depends(get_job_service)) -> FileResponse:
    try:
        job = service.get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc

    if fmt not in job.result.generated_files:
        raise HTTPException(status_code=404, detail="Requested format not generated")

    file_path = Path(job.result.generated_files[fmt])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Generated file missing on disk")

    media_type = "application/json" if fmt == "json" else "text/plain"
    return FileResponse(path=file_path, filename=file_path.name, media_type=media_type)
