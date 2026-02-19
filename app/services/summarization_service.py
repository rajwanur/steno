from __future__ import annotations

import re

from openai import OpenAI

from app.config import settings
from app.core.summary_prompts import SUMMARY_PROMPT_TEMPLATES


class SummarizationService:
    _think_block_re = re.compile(r"<think\b[^>]*>.*?</think>", re.IGNORECASE | re.DOTALL)
    _think_tag_re = re.compile(r"</?think\b[^>]*>", re.IGNORECASE)

    @classmethod
    def _sanitize_output(cls, text: str) -> str:
        cleaned = cls._think_block_re.sub("", text or "")
        cleaned = cls._think_tag_re.sub("", cleaned)
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
        return cleaned

    def summarize(
        self,
        transcript: str,
        style: str,
        style_prompt: str | None = None,
        llm_api_base: str | None = None,
        llm_api_key: str | None = None,
        llm_model: str | None = None,
    ) -> str:
        api_base = llm_api_base if llm_api_base is not None else settings.llm_api_base
        api_key = llm_api_key if llm_api_key is not None else settings.llm_api_key
        model = llm_model if llm_model is not None else settings.llm_model

        if not api_base or not api_key:
            raise RuntimeError("Summary requested but LLM API is not configured.")

        resolved_style_prompt = (
            style_prompt.strip()
            if isinstance(style_prompt, str) and style_prompt.strip()
            else SUMMARY_PROMPT_TEMPLATES.get(style, "Give a concise summary.")
        )

        client = OpenAI(base_url=api_base, api_key=api_key)

        resp = client.chat.completions.create(
            model=model,
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
                    "content": f"{resolved_style_prompt}\n\nTranscript:\n{transcript}",
                },
            ],
        )

        return self._sanitize_output(resp.choices[0].message.content or "")
