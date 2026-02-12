from __future__ import annotations

from openai import OpenAI

from app.config import settings


class SummarizationService:
    def __init__(self) -> None:
        self.enabled = bool(settings.llm_api_base and settings.llm_api_key)

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
                    "content": "You summarize meeting transcripts accurately and avoid inventing facts.",
                },
                {
                    "role": "user",
                    "content": f"{style_prompt}\n\nTranscript:\n{transcript}",
                },
            ],
        )

        return resp.choices[0].message.content or ""
