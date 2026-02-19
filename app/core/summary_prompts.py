from __future__ import annotations

from copy import deepcopy
import re
from typing import Mapping

SUMMARY_PROMPT_TEMPLATES: dict[str, str] = {
    "short": "Give a concise 3-5 sentence summary.",
    "detailed": "Provide a detailed structured summary with key context and decisions.",
    "bullet": "Provide a bullet-point summary of key points.",
    "action_items": "Extract clear action items with owners if mentioned and deadlines if present.",
}


def default_summary_prompt_templates() -> dict[str, str]:
    return deepcopy(SUMMARY_PROMPT_TEMPLATES)


def normalize_summary_style_key(value: str) -> str:
    cleaned = (value or "").strip().lower()
    cleaned = re.sub(r"[\s\-]+", "_", cleaned)
    cleaned = re.sub(r"[^a-z0-9_]", "", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned.strip("_")


def merge_summary_prompt_templates(overrides: Mapping[str, str] | None) -> dict[str, str]:
    merged = default_summary_prompt_templates()
    if not overrides:
        return merged

    for style, prompt in overrides.items():
        normalized_style = normalize_summary_style_key(str(style))
        if not normalized_style:
            continue
        if not isinstance(prompt, str):
            continue
        cleaned = prompt.strip()
        if cleaned:
            merged[normalized_style] = cleaned
    return merged
