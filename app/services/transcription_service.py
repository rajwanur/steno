from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import whisperx

from app.config import settings
from app.schemas import JobCreateParams


class TranscriptionService:
    def transcribe(self, audio_path: Path, params: JobCreateParams) -> Dict[str, Any]:
        device = params.device or settings.default_device
        model_name = params.model_name or settings.default_model
        language = params.language or None

        model = whisperx.load_model(
            model_name,
            device,
            compute_type=params.compute_type,
            language=language,
        )
        audio = whisperx.load_audio(str(audio_path))
        result = model.transcribe(audio, batch_size=params.batch_size)

        align_model, metadata = whisperx.load_align_model(
            language_code=result["language"],
            device=device,
        )
        result = whisperx.align(
            result["segments"],
            align_model,
            metadata,
            audio,
            device,
            return_char_alignments=False,
        )

        if params.diarization:
            if not settings.hf_token:
                raise RuntimeError("Diarization requested but HF_TOKEN is not configured.")
            diarize_model = whisperx.DiarizationPipeline(
                use_auth_token=settings.hf_token,
                device=device,
            )
            diarize_segments = diarize_model(str(audio_path))
            result = whisperx.assign_word_speakers(diarize_segments, result)

        return result
