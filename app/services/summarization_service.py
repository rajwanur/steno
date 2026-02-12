from __future__ import annotations

import re

from openai import OpenAI

from app.config import settings


class SummarizationService:
    _think_block_re = re.compile(r"<think\b[^>]*>.*?</think>", re.IGNORECASE | re.DOTALL)
    _think_tag_re = re.compile(r"</?think\b[^>]*>", re.IGNORECASE)

    def __init__(self) -> None:
        self.enabled = bool(settings.llm_api_base and settings.llm_api_key)

    @classmethod
    def _sanitize_output(cls, text: str) -> str:
        cleaned = cls._think_block_re.sub("", text or "")
        cleaned = cls._think_tag_re.sub("", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
        return cleaned

    def summarize(self, transcript: str, style: str) -> str:
        if not self.enabled:
            raise RuntimeError("Summary requested but LLM API is not configured.")

        style_prompt = {
            "short": "Give a concise 3-5 sentence summary.",
            "detailed": "Provide a detailed structured summary with key context and decisions.",
            "bullet": "Provide a bullet-point summary of key points.",
            "action_items": "Extract clear action items with owners if mentioned and deadlines if present.",
        }.get(style, "Give a concise summary.")

        client = OpenAI(base_url=settings.llm_api_base, api_key=settings.llm_api_key)

        resp = client.chat.completions.create(
            model=settings.llm_model,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You summarize meeting transcripts accurately and avoid inventing facts. "
                        "Do not emit chain-of-thought or <think> tags."
                    ),
                },
                {
                    "role": "user",
                    "content": f"{style_prompt}\n\nTranscript:\n{transcript}",
                },
            ],
        )

        return self._sanitize_output(resp.choices[0].message.content or "")
