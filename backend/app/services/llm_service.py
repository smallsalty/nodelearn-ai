from typing import Any

from app.core.config import settings

MOCK_TIME = "2026-05-19T10:00:00Z"


class LLMService:
    """Mock LLM boundary that can be replaced by a real provider later."""

    def __init__(self, provider: str | None = None, model_name: str | None = None) -> None:
        self.provider = provider or settings.llm_provider or "mock"
        self.model_name = model_name or settings.llm_model_name or "mock-model"
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
        return {
            "provider": self.provider,
            "modelName": self.model_name,
            "prompt": prompt,
            "data": kwargs.get("mock_data", {}),
        }

    async def generate_text(self, prompt: str, **kwargs: Any) -> str:
        self._record_call(prompt)
        return kwargs.get("mock_text", "mock generated text")
