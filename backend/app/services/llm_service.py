import json
from typing import Any

import httpx

from app.core.config import settings


class LLMService:
    """Unified async LLM boundary for mock mode and DeepSeek chat completions."""

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    @property
    def model_name(self) -> str:
        return settings.llm_model_name or "mock-model"

    @property
    def provider_name(self) -> str:
        return settings.llm_provider or "mock"

    def is_deepseek_configured(self) -> bool:
        return (
            settings.llm_provider == "deepseek"
            and bool(settings.llm_api_key)
            and bool(settings.llm_base_url)
            and bool(settings.llm_model_name)
        )

    async def generate_text(
        self,
        prompt: str,
        *,
        mock_text: str | None = None,
        temperature: float = 0.7,
    ) -> str:
        if settings.enable_mock:
            return mock_text if mock_text is not None else "mock response"

        return await self._generate_content(prompt, temperature=temperature)

    async def generate_json(
        self,
        prompt: str,
        *,
        mock_data: dict[str, Any] | None = None,
        temperature: float = 0.2,
    ) -> dict[str, Any]:
        if settings.enable_mock:
            return dict(mock_data or {})

        content = await self._generate_content(
            prompt,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        content = content.strip()
        if content.startswith("```") and content.endswith("```"):
            content = content.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise RuntimeError("LLM returned invalid JSON") from exc
        if not isinstance(parsed, dict):
            raise RuntimeError("LLM returned JSON that is not an object")
        return parsed

    async def _generate_content(
        self,
        prompt: str,
        *,
        temperature: float,
        response_format: dict[str, str] | None = None,
    ) -> str:
        for attempt in range(3):
            try:
                response = await self._create_completion(
                    prompt,
                    temperature=temperature,
                    response_format=response_format,
                )
            except httpx.TimeoutException as exc:
                if attempt == 2:
                    raise RuntimeError("DeepSeek request timed out") from exc
                continue
            try:
                return self._extract_content(response)
            except RuntimeError as exc:
                if str(exc) != "DeepSeek response message content is empty" or attempt == 2:
                    raise
        raise RuntimeError("DeepSeek response message content is empty")

    async def _create_completion(
        self,
        prompt: str,
        *,
        temperature: float,
        response_format: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        if not self.is_deepseek_configured():
            raise RuntimeError("DeepSeek is not fully configured")

        payload: dict[str, Any] = {
            "model": settings.llm_model_name,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }
        if response_format is not None:
            payload["response_format"] = response_format

        if self._client is not None:
            return await self._post_completion(self._client, payload)

        async with httpx.AsyncClient(base_url=settings.llm_base_url, timeout=httpx.Timeout(180.0, connect=30.0)) as client:
            return await self._post_completion(client, payload)

    async def _post_completion(
        self,
        client: httpx.AsyncClient,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        response = await client.post(
            "/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json=payload,
        )
        if not response.is_success:
            raise RuntimeError(f"DeepSeek request failed with HTTP {response.status_code}")
        parsed = response.json()
        if not isinstance(parsed, dict):
            raise RuntimeError("DeepSeek returned an invalid response body")
        return parsed

    def _extract_content(self, response: dict[str, Any]) -> str:
        try:
            content = response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError("DeepSeek response is missing message content") from exc
        if not isinstance(content, str) or not content.strip():
            raise RuntimeError("DeepSeek response message content is empty")
        return content
