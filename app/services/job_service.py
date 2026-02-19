from __future__ import annotations

import asyncio
import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from fastapi import UploadFile

from app.config import settings
from app.schemas import JobCreateParams, JobListItem, JobState
from app.services.export_service import ExportService
from app.services.file_service import FileService
from app.services.global_settings_service import GlobalSettingsService
from app.services.summarization_service import SummarizationService
from app.services.transcription_service import TranscriptionService


class JobService:
    def __init__(self) -> None:
        self.file_service = FileService()
        self.transcription_service = TranscriptionService()
        self.export_service = ExportService()
        self.summarization_service = SummarizationService()
        self.global_settings_service = GlobalSettingsService()

        self.jobs: Dict[str, JobState] = {}
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.worker_task: asyncio.Task | None = None
        self.current_job_id: str | None = None

    @staticmethod
    def _utcnow() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _ensure_aware_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    async def start_worker(self) -> None:
        self._load_jobs_from_disk()
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
        self._push_event(state, "Job queued.")
        self.jobs[job_id] = state
        self._save_job(state)
        await self.queue.put(job_id)
        return job_id

    def get_job(self, job_id: str) -> JobState:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError("Job not found")
        return job

    def list_jobs(self) -> List[JobListItem]:
        for job in self.jobs.values():
            job.created_at = self._ensure_aware_utc(job.created_at)
            job.updated_at = self._ensure_aware_utc(job.updated_at)
        jobs = sorted(self.jobs.values(), key=lambda j: j.updated_at, reverse=True)
        return [
            JobListItem(
                id=j.id,
                filename=j.filename,
                file_type=j.file_type,
                status=j.status,
                progress=j.progress,
                step=j.step,
                error=j.error,
                created_at=j.created_at,
                updated_at=j.updated_at,
            )
            for j in jobs
        ]

    async def _worker(self) -> None:
        while True:
            job_id = await self.queue.get()
            try:
                await self._process_job(job_id)
            finally:
                self.queue.task_done()

    async def _process_job(self, job_id: str) -> None:
        job = self.get_job(job_id)
        if job.status == "cancelled":
            return
        if job.cancel_requested:
            self._mark_cancelled(job, "Cancelled before processing started.")
            return

        self.current_job_id = job_id
        job.status = "processing"
        job.progress = 10
        job.step = "preparing"
        job.updated_at = self._utcnow()
        self._push_event(job, "Started processing.")
        self._save_job(job)

        try:
            global_settings = self.global_settings_service.get()
            style_prompt = global_settings.summary_prompt_templates.get(
                job.params.summary_style
            )

            def _progress_cb(progress: int, step: str, event: str) -> None:
                if job.cancel_requested:
                    raise asyncio.CancelledError("Cancellation requested by user.")
                job.progress = progress
                job.step = step
                job.updated_at = self._utcnow()
                self._push_event(job, event)
                self._save_job(job)

            result = await asyncio.to_thread(
                self.transcription_service.transcribe,
                Path(job.audio_path),
                job.params,
                _progress_cb,
                global_settings.hf_token,
            )

            job.progress = 70
            job.step = "exporting"
            job.updated_at = self._utcnow()
            self._push_event(job, "Generating output files.")
            self._save_job(job)

            job.result.transcript = result.get("text", "")
            job.result.segments = result.get("segments", [])
            job.result.language = result.get("language")
            if job.cancel_requested:
                raise asyncio.CancelledError("Cancellation requested by user.")

            outputs = self.export_service.write_outputs(
                job_dir=Path(job.source_path).parent,
                base_name="transcript",
                result=result,
                output_formats=job.params.output_formats,
            )
            job.result.generated_files = outputs
            self._save_job(job)

            if job.params.summary_enabled:
                job.progress = 85
                job.step = "summarizing"
                job.updated_at = self._utcnow()
                self._push_event(job, "Generating summary.")
                self._save_job(job)
                summary = await asyncio.to_thread(
                    self.summarization_service.summarize,
                    self._transcript_for_summary(job),
                    job.params.summary_style,
                    style_prompt,
                    global_settings.llm_api_base,
                    global_settings.llm_api_key,
                    global_settings.llm_model,
                )
                job.result.summary = summary
                job.result.summaries[job.params.summary_style] = summary

            job.status = "completed"
            job.progress = 100
            job.step = "done"
            job.updated_at = self._utcnow()
            self._apply_storage_retention(job)
            self._push_event(job, "Completed successfully.")
            self._save_job(job)

        except asyncio.CancelledError:
            self._mark_cancelled(job, "Cancelled by user.")
        except Exception as exc:
            job.status = "failed"
            job.progress = 100
            job.step = "failed"
            job.error = str(exc)
            job.updated_at = self._utcnow()
            self._apply_storage_retention(job)
            self._push_event(job, f"Failed: {job.error}")
            self._save_job(job)
        finally:
            if self.current_job_id == job_id:
                self.current_job_id = None

    @staticmethod
    def _push_event(job: JobState, message: str) -> None:
        ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
        entry = f"[{ts}] {message}"
        if not job.events or job.events[-1] != entry:
            job.events.append(entry)
        if len(job.events) > 120:
            job.events = job.events[-120:]

    def _job_json_path(self, job_id: str) -> Path:
        return settings.jobs_dir / job_id / "job.json"

    def _save_job(self, job: JobState) -> None:
        p = self._job_json_path(job.id)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(job.model_dump(mode="json"), ensure_ascii=False, indent=2), encoding="utf-8")

    def _load_jobs_from_disk(self) -> None:
        self.jobs.clear()
        settings.jobs_dir.mkdir(parents=True, exist_ok=True)
        for path in settings.jobs_dir.glob("*/job.json"):
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
                job = JobState.model_validate(raw)
                job.created_at = self._ensure_aware_utc(job.created_at)
                job.updated_at = self._ensure_aware_utc(job.updated_at)
                if job.status in ("queued", "processing"):
                    job.status = "failed"
                    job.step = "interrupted"
                    job.error = "Server restarted before job completion."
                    job.updated_at = self._utcnow()
                    self._push_event(job, "Marked interrupted after restart.")
                    self._save_job(job)
                self.jobs[job.id] = job
            except Exception:
                continue

    def cancel_job(self, job_id: str) -> JobState:
        job = self.get_job(job_id)
        if job.status in ("completed", "failed", "cancelled"):
            return job

        job.cancel_requested = True
        self._push_event(job, "Cancellation requested.")

        if job.status == "queued":
            self._mark_cancelled(job, "Cancelled before execution.")
        else:
            job.step = "cancelling"
            job.updated_at = self._utcnow()
            self._save_job(job)
        return job

    def clear_queue(self, include_active: bool = True) -> int:
        cleared = 0
        queued_ids = [j.id for j in self.jobs.values() if j.status == "queued"]
        for job_id in queued_ids:
            try:
                self.cancel_job(job_id)
                cleared += 1
            except KeyError:
                continue
        if include_active and self.current_job_id:
            self.cancel_job(self.current_job_id)
        return cleared

    def delete_job(self, job_id: str, confirm_text: str) -> JobState:
        job = self.get_job(job_id)
        if job.status in ("queued", "processing"):
            raise RuntimeError("Only completed, failed, or cancelled jobs can be deleted.")

        expected = (job.filename or "").strip()
        provided = (confirm_text or "").strip()
        if not expected or provided != expected:
            raise RuntimeError("Confirmation text must exactly match the filename.")

        if self.current_job_id == job_id:
            raise RuntimeError("Cannot delete a job that is currently active.")

        self.jobs.pop(job_id, None)
        job_dir = settings.jobs_dir / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)
        return job

    async def regenerate_summary(self, job_id: str, style: str) -> JobState:
        job = self.get_job(job_id)
        if job.status not in ("completed", "failed"):
            raise RuntimeError("Summary can be generated after transcription finishes.")

        transcript = self._transcript_for_summary(job)
        if not transcript.strip():
            raise RuntimeError("Transcript is empty; cannot generate summary.")

        job.step = "summarizing"
        job.updated_at = self._utcnow()
        self._push_event(job, f"Generating '{style}' summary.")
        self._save_job(job)

        global_settings = self.global_settings_service.get()
        style_prompt = global_settings.summary_prompt_templates.get(style)
        summary = await asyncio.to_thread(
            self.summarization_service.summarize,
            transcript,
            style,
            style_prompt,
            global_settings.llm_api_base,
            global_settings.llm_api_key,
            global_settings.llm_model,
        )
        job.result.summary = summary
        job.result.summaries[style] = summary
        job.step = "done" if job.status == "completed" else job.step
        job.updated_at = self._utcnow()
        self._push_event(job, f"Summary '{style}' generated.")
        self._save_job(job)
        return job

    def _transcript_for_summary(self, job: JobState) -> str:
        text = (job.result.transcript or "").strip()
        if text:
            return text
        if job.result.segments:
            return " ".join((seg.get("text", "").strip() for seg in job.result.segments)).strip()
        return ""

    def _mark_cancelled(self, job: JobState, message: str) -> None:
        job.status = "cancelled"
        job.progress = 100
        job.step = "cancelled"
        job.error = None
        job.updated_at = self._utcnow()
        self._apply_storage_retention(job)
        self._push_event(job, message)
        self._save_job(job)

    def _apply_storage_retention(self, job: JobState) -> None:
        source = Path(job.source_path) if job.source_path else None
        audio = Path(job.audio_path) if job.audio_path else None

        if not job.params.retain_export_files:
            for _, file_path in list(job.result.generated_files.items()):
                try:
                    p = Path(file_path)
                    if p.exists() and p.is_file():
                        p.unlink()
                except Exception:
                    continue
            job.result.generated_files = {}

        if source and audio and source == audio:
            if not (job.params.retain_source_files or job.params.retain_processed_audio):
                self._remove_file_if_exists(source)
                job.source_path = ""
                job.audio_path = ""
            return

        if source and not job.params.retain_source_files:
            self._remove_file_if_exists(source)
            job.source_path = ""

        if audio and not job.params.retain_processed_audio:
            self._remove_file_if_exists(audio)
            job.audio_path = ""

    @staticmethod
    def _remove_file_if_exists(path: Path) -> None:
        try:
            if path.exists() and path.is_file():
                path.unlink()
        except Exception:
            return
