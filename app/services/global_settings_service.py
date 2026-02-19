from __future__ import annotations

import json
from typing import Any, Dict

from app.config import settings
from app.core.summary_prompts import (
    default_summary_prompt_templates,
    merge_summary_prompt_templates,
)
from app.schemas import GlobalSettings, GlobalSettingsUpdate


class GlobalSettingsService:
    def __init__(self) -> None:
        self.path = settings.storage_dir / "global_settings.json"

    def _defaults(self) -> GlobalSettings:
        return GlobalSettings(
            default_model=settings.default_model,
            default_language=settings.default_language,
            default_batch_size=settings.default_batch_size,
            default_device=settings.default_device,
            compute_type=settings.compute_type,
            llm_api_base=settings.llm_api_base,
            llm_api_key=settings.llm_api_key,
            llm_model=settings.llm_model,
            retain_source_files=True,
            retain_processed_audio=True,
            retain_export_files=True,
            summary_prompt_templates=default_summary_prompt_templates(),
            hf_token=settings.hf_token,
            app_host=settings.app_host,
            app_port=settings.app_port,
            app_reload=settings.app_reload,
        )

    def get(self) -> GlobalSettings:
        defaults = self._defaults()
        if not self.path.exists():
            return defaults
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            raw_templates = raw.get("summary_prompt_templates")
            raw["summary_prompt_templates"] = merge_summary_prompt_templates(raw_templates)
            merged = {**defaults.model_dump(), **raw}
            return GlobalSettings.model_validate(merged)
        except Exception:
            return defaults

    def update(self, payload: GlobalSettingsUpdate) -> GlobalSettings:
        current = self.get()
        patch: Dict[str, Any] = payload.model_dump(exclude_unset=True)
        if "summary_prompt_templates" in patch:
            patch["summary_prompt_templates"] = merge_summary_prompt_templates(
                patch["summary_prompt_templates"]
            )
        updated = current.model_copy(update=patch)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(updated.model_dump(mode="json"), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return updated
