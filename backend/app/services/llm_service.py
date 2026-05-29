from typing import Any

from app.core.config import settings


class LLMService:
    """Reserved LLM provider boundary.

    DeepSeek and other providers will be integrated here later. Current scaffold
    intentionally avoids real external calls and returns no model output.
    """

    def provider_name(self) -> str:
        return settings.llm_provider or "mock"

    def is_deepseek_configured(self) -> bool:
        return settings.llm_provider == "deepseek" and bool(settings.llm_api_key)

    def generate_json(self, prompt: str) -> dict[str, Any] | None:
        return None
