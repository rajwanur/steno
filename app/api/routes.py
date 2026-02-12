from __future__ import annotations

import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse

from app.config import settings
from app.schemas import (
    JobCreateParams,
    JobCreateResponse,
    JobListItem,
    JobStatusResponse,
    QueueControlResponse,
    SummaryRequest,
)
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
        "devices": ["auto", "cpu", "cuda"],
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
        filename=job.filename,
        file_type=job.file_type,
        status=job.status,
        progress=job.progress,
        step=job.step,
        error=job.error,
        events=job.events,
        created_at=job.created_at,
        updated_at=job.updated_at,
        params=job.params,
        result=job.result,
    )


@router.get("/jobs", response_model=list[JobListItem])
def list_jobs(service: JobService = Depends(get_job_service)) -> list[JobListItem]:
    return service.list_jobs()


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


@router.get("/jobs/{job_id}/output/{fmt}")
def preview_output(job_id: str, fmt: str, service: JobService = Depends(get_job_service)):
    try:
        job = service.get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc

    if fmt not in job.result.generated_files:
        raise HTTPException(status_code=404, detail="Requested format not generated")

    file_path = Path(job.result.generated_files[fmt])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Generated file missing on disk")

    if fmt == "json":
        return JSONResponse(content=json.loads(file_path.read_text(encoding="utf-8")))
    if fmt in {"txt", "srt", "vtt", "tsv"}:
        return PlainTextResponse(content=file_path.read_text(encoding="utf-8"))

    raise HTTPException(status_code=400, detail="Preview is not supported for this format")


@router.post("/jobs/{job_id}/cancel", response_model=QueueControlResponse)
def cancel_job(job_id: str, service: JobService = Depends(get_job_service)) -> QueueControlResponse:
    try:
        job = service.cancel_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc
    return QueueControlResponse(message=f"Job {job.id} marked for cancellation.")


@router.post("/queue/clear", response_model=QueueControlResponse)
def clear_queue(
    include_active: bool = True,
    service: JobService = Depends(get_job_service),
) -> QueueControlResponse:
    cleared = service.clear_queue(include_active=include_active)
    return QueueControlResponse(message=f"Cancelled {cleared} queued job(s).")


@router.delete("/jobs/{job_id}", response_model=QueueControlResponse)
def delete_job(
    job_id: str,
    confirm: bool = False,
    confirm_text: str = "",
    service: JobService = Depends(get_job_service),
) -> QueueControlResponse:
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Deletion requires explicit confirmation.",
        )
    try:
        job = service.delete_job(job_id=job_id, confirm_text=confirm_text)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return QueueControlResponse(
        message=f"Deleted '{job.filename}' and all associated files."
    )


@router.post("/jobs/{job_id}/summary", response_model=JobStatusResponse)
async def regenerate_summary(
    job_id: str,
    payload: SummaryRequest,
    service: JobService = Depends(get_job_service),
) -> JobStatusResponse:
    try:
        job = await service.regenerate_summary(job_id=job_id, style=payload.style)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return JobStatusResponse(
        id=job.id,
        filename=job.filename,
        file_type=job.file_type,
        status=job.status,
        progress=job.progress,
        step=job.step,
        error=job.error,
        events=job.events,
        created_at=job.created_at,
        updated_at=job.updated_at,
        params=job.params,
        result=job.result,
    )
