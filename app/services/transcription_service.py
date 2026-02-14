from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Callable, Dict, cast

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

    @staticmethod
    def _normalize_diarization_output(raw: Any) -> Any:
        # WhisperX diarization may return either a DataFrame or (DataFrame, metadata).
        if isinstance(raw, tuple) and raw:
            return raw[0]
        return raw

    @staticmethod
    def _resolve_device(requested_device: str) -> str:
        try:
            import torch
        except Exception:
            return "cpu" if requested_device == "auto" else requested_device

        if requested_device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"

        if requested_device == "cuda" and not torch.cuda.is_available():
            raise RuntimeError(
                "CUDA was selected, but no CUDA/ROCm runtime is available for this PyTorch install. "
                "For AMD GPUs, use a ROCm-compatible PyTorch build (typically on Linux). "
                "Otherwise select device=cpu."
            )
        return requested_device

    def transcribe(
        self,
        audio_path: Path,
        params: JobCreateParams,
        progress_cb: Callable[[int, str, str], None] | None = None,
        hf_token: str | None = None,
    ) -> Dict[str, Any]:
        self._prepare_torch_checkpoint_loading()
        self._patch_torch_load()

        requested_device = params.device or settings.default_device
        device = self._resolve_device(requested_device)
        model_name = params.model_name or settings.default_model
        language = params.language or None

        if progress_cb:
            progress_cb(15, "loading model", f"Loading WhisperX model '{model_name}' on {device}.")
        model = whisperx.load_model(
            model_name,
            device,
            compute_type=params.compute_type,
            language=language,
        )

        if progress_cb:
            progress_cb(30, "transcribing", "Running speech-to-text transcription.")
        audio = whisperx.load_audio(str(audio_path))
        result: Any = model.transcribe(audio, batch_size=params.batch_size)

        if progress_cb:
            progress_cb(55, "aligning", "Aligning timestamps for higher accuracy.")
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
            effective_hf_token = hf_token if hf_token is not None else settings.hf_token
            if not effective_hf_token:
                raise RuntimeError("Diarization requested but HF_TOKEN is not configured.")
            if progress_cb:
                progress_cb(75, "diarizing", "Running speaker diarization.")
            diarization_pipeline, assign_word_speakers = self._get_diarization_components()
            diarize_model = diarization_pipeline(
                use_auth_token=effective_hf_token,
                device=device,
            )
            diarize_raw = diarize_model(str(audio_path))
            diarize_segments = self._normalize_diarization_output(diarize_raw)
            result = assign_word_speakers(cast(Any, diarize_segments), cast(Any, result))

        if progress_cb:
            progress_cb(88, "finalizing", "Finalizing transcript output.")

        return cast(Dict[str, Any], result)
