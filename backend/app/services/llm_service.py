import json
import re
from typing import Any

import httpx

from app.core.config import settings

MOCK_TIME = "2026-05-19T10:00:00Z"


class LLMService:
    """Unified LLM boundary for mock mode and OpenAI-compatible providers."""

    def __init__(self, provider: str | None = None, model_name: str | None = None) -> None:
        self.provider = provider or settings.llm_provider or ("mock" if settings.enable_mock else "")
        self.model_name = model_name or settings.llm_model_name or ("mock-model" if settings.enable_mock else "deepseek-v4-pro")
        self.call_records: list[dict[str, Any]] = []

    def _record_call(self, prompt: str) -> None:
        self.call_records.append(
            {
                "provider": self.provider,
                "modelName": self.model_name,
                "prompt": prompt,
                "createdAt": MOCK_TIME,
            }
        )

    async def generate_json(self, prompt: str, **kwargs: Any) -> dict[str, Any]:
        self._record_call(prompt)
        if self._use_mock():
            return {
                "provider": self.provider,
                "modelName": self.model_name,
                "prompt": prompt,
                "data": kwargs.get("mock_data", {}),
            }

        content = await self._chat_completion(
            [
                {
                    "role": "system",
                    "content": "Return a valid JSON object only. Do not wrap it in Markdown.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=kwargs.get("temperature", 0.2),
        )
        return self._parse_json_object(content)

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        self._record_call(prompt)
        if self._use_mock():
            return kwargs.get("mock_text", "mock generated text")

        return await self._chat_completion(
            [{"role": "user", "content": prompt}],
            temperature=kwargs.get("temperature", 0.7),
        )

    def _use_mock(self) -> bool:
        return settings.enable_mock

    async def _chat_completion(self, messages: list[dict[str, str]], temperature: float) -> str:
        if not settings.llm_api_key:
            raise RuntimeError("LLM_API_KEY is not configured")
        if not settings.llm_base_url:
            raise RuntimeError("LLM_BASE_URL is not configured")

        endpoint = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
        }
        headers = {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(endpoint, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()

        choices = body.get("choices") or []
        if not choices:
            raise RuntimeError("LLM response missing choices")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("LLM response missing message content")
        return content.strip()

    def _parse_json_object(self, content: str) -> dict[str, Any]:
        normalized = content.strip()
        if normalized.startswith("```"):
            normalized = re.sub(r"^```(?:json)?\s*", "", normalized)
            normalized = re.sub(r"\s*```$", "", normalized)
        try:
            value = json.loads(normalized)
        except json.JSONDecodeError as exc:
            raise RuntimeError("LLM JSON response is invalid") from exc
        if not isinstance(value, dict):
            raise RuntimeError("LLM JSON response must be an object")
        return value
