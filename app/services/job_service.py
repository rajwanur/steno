from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict

from fastapi import UploadFile

from app.config import settings
from app.schemas import JobCreateParams, JobState
from app.services.export_service import ExportService
from app.services.file_service import FileService
from app.services.summarization_service import SummarizationService
from app.services.transcription_service import TranscriptionService


class JobService:
    def __init__(self) -> None:
        self.file_service = FileService()
        self.transcription_service = TranscriptionService()
        self.export_service = ExportService()
        self.summarization_service = SummarizationService()

        self.jobs: Dict[str, JobState] = {}
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.worker_task: asyncio.Task | None = None

    async def start_worker(self) -> None:
        if self.worker_task is None:
            self.worker_task = asyncio.create_task(self._worker(), name="whisperx-worker")

    async def stop_worker(self) -> None:
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass

    async def create_job(self, file: UploadFile, params: JobCreateParams) -> str:
        job_id = str(uuid.uuid4())
        job_dir = settings.jobs_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        source_name = Path(file.filename or "input.bin").name
        source_path = job_dir / source_name
        await self.file_service.save_upload(file, source_path)

        media_type = self.file_service.get_media_type(source_path)
        audio_path = await self.file_service.ensure_audio_mp3(source_path, job_dir, media_type)

        state = JobState(
            id=job_id,
            filename=source_name,
            source_path=str(source_path),
            audio_path=str(audio_path),
            file_type=media_type,
            params=params,
        )
        self.jobs[job_id] = state
        await self.queue.put(job_id)
        return job_id

    def get_job(self, job_id: str) -> JobState:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError("Job not found")
        return job

    async def _worker(self) -> None:
        while True:
            job_id = await self.queue.get()
            try:
                await self._process_job(job_id)
            finally:
                self.queue.task_done()

    async def _process_job(self, job_id: str) -> None:
        job = self.get_job(job_id)
        job.status = "processing"
        job.progress = 10
        job.step = "transcribing"
        job.updated_at = datetime.utcnow()

        try:
            result = await asyncio.to_thread(
                self.transcription_service.transcribe,
                Path(job.audio_path),
                job.params,
            )

            job.progress = 70
            job.step = "exporting"
            job.updated_at = datetime.utcnow()

            job.result.transcript = result.get("text", "")
            job.result.segments = result.get("segments", [])
            job.result.language = result.get("language")

            outputs = self.export_service.write_outputs(
                job_dir=Path(job.source_path).parent,
                base_name="transcript",
                result=result,
                output_formats=job.params.output_formats,
            )
            job.result.generated_files = outputs

            if job.params.summary_enabled:
                job.progress = 85
                job.step = "summarizing"
                job.updated_at = datetime.utcnow()
                summary = await asyncio.to_thread(
                    self.summarization_service.summarize,
                    job.result.transcript or "",
                    job.params.summary_style,
                )
                job.result.summary = summary

            job.status = "completed"
            job.progress = 100
            job.step = "done"
            job.updated_at = datetime.utcnow()

        except Exception as exc:
            job.status = "failed"
            job.progress = 100
            job.step = "failed"
            job.error = str(exc)
            job.updated_at = datetime.utcnow()
