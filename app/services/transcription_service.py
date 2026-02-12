from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

import whisperx

from app.config import settings
from app.schemas import JobCreateParams


class TranscriptionService:
    _torch_load_patched: bool = False

    @staticmethod
    def _prepare_torch_checkpoint_loading() -> None:
        """
        PyTorch 2.6 changed torch.load default `weights_only=True`, which can break
        trusted pyannote/WhisperX diarization checkpoints that contain OmegaConf types.
        """
        # Force legacy checkpoint behavior for trusted local inference models.
        os.environ["TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD"] = "1"

        try:
            import torch
            from omegaconf.base import ContainerMetadata
            from omegaconf.dictconfig import DictConfig
            from omegaconf.listconfig import ListConfig
            from omegaconf.nodes import AnyNode

            torch.serialization.add_safe_globals([ListConfig, DictConfig, ContainerMetadata, AnyNode])
        except Exception:
            # If torch/omegaconf APIs differ, downstream exception will include details.
            pass

    @classmethod
    def _patch_torch_load(cls) -> None:
        if cls._torch_load_patched:
            return
        try:
            import torch
        except Exception:
            return

        original_torch_load = torch.load

        def _patched_torch_load(*args: Any, **kwargs: Any):
            # Keep explicit caller choice, but make default compatible with
            # WhisperX/pyannote checkpoints on PyTorch 2.6+.
            kwargs.setdefault("weights_only", False)
            return original_torch_load(*args, **kwargs)

        torch.load = _patched_torch_load
        cls._torch_load_patched = True

    @staticmethod
    def _get_diarization_components():
        """
        WhisperX API differs by version:
        - some expose DiarizationPipeline/assign_word_speakers at top-level
        - some expose them under whisperx.diarize
        """
        diarization_pipeline = getattr(whisperx, "DiarizationPipeline", None)
        assign_word_speakers = getattr(whisperx, "assign_word_speakers", None)

        if diarization_pipeline and assign_word_speakers:
            return diarization_pipeline, assign_word_speakers

        try:
            from whisperx.diarize import DiarizationPipeline, assign_word_speakers

            return DiarizationPipeline, assign_word_speakers
        except Exception as exc:
            raise RuntimeError(
                "Installed whisperx version does not expose diarization APIs. "
                "Please install a whisperx build with diarization support."
            ) from exc

    def transcribe(self, audio_path: Path, params: JobCreateParams) -> Dict[str, Any]:
        self._prepare_torch_checkpoint_loading()
        self._patch_torch_load()

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
            diarization_pipeline, assign_word_speakers = self._get_diarization_components()
            diarize_model = diarization_pipeline(
                use_auth_token=settings.hf_token,
                device=device,
            )
            diarize_segments = diarize_model(str(audio_path))
            result = assign_word_speakers(diarize_segments, result)

        return result
