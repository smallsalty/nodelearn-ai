import json
import asyncio

import httpx
import pytest

from app.core.config import settings
from app.services.llm_service import LLMService


def configure_real_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "enable_mock", False)
    monkeypatch.setattr(settings, "llm_provider", "deepseek")
    monkeypatch.setattr(settings, "llm_api_key", "test-secret")
    monkeypatch.setattr(settings, "llm_base_url", "https://api.deepseek.com")
    monkeypatch.setattr(settings, "llm_model_name", "deepseek-v4-pro")


def test_generate_text_calls_chat_completions(monkeypatch: pytest.MonkeyPatch) -> None:
    configure_real_mode(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/chat/completions"
        assert request.headers["Authorization"] == "Bearer test-secret"
        payload = json.loads(request.content)
        assert payload["model"] == "deepseek-v4-pro"
        return httpx.Response(200, json={"choices": [{"message": {"content": "hello"}}]})

    async def call() -> str:
        async with httpx.AsyncClient(
            base_url=settings.llm_base_url,
            transport=httpx.MockTransport(handler),
        ) as client:
            return await LLMService(client).generate_text("question")

    assert asyncio.run(call()) == "hello"


def test_generate_json_enables_json_object_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    configure_real_mode(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        assert payload["response_format"] == {"type": "json_object"}
        return httpx.Response(200, json={"choices": [{"message": {"content": '{"goal":"learn"}'}}]})

    async def call() -> dict:
        async with httpx.AsyncClient(
            base_url=settings.llm_base_url,
            transport=httpx.MockTransport(handler),
        ) as client:
            return await LLMService(client).generate_json("extract")

    assert asyncio.run(call()) == {"goal": "learn"}


def test_generate_text_raises_for_auth_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    configure_real_mode(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": {"message": "Unauthorized"}})

    async def call() -> str:
        async with httpx.AsyncClient(
            base_url=settings.llm_base_url,
            transport=httpx.MockTransport(handler),
        ) as client:
            return await LLMService(client).generate_text("question")

    with pytest.raises(RuntimeError, match="HTTP 401"):
        asyncio.run(call())


def test_generate_text_retries_one_empty_content_response(monkeypatch: pytest.MonkeyPatch) -> None:
    configure_real_mode(monkeypatch)
    requests = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal requests
        requests += 1
        content = "" if requests == 1 else "hello after retry"
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    async def call() -> str:
        async with httpx.AsyncClient(
            base_url=settings.llm_base_url,
            transport=httpx.MockTransport(handler),
        ) as client:
            return await LLMService(client).generate_text("question")

    assert asyncio.run(call()) == "hello after retry"
    assert requests == 2


def test_generate_json_raises_for_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    configure_real_mode(monkeypatch)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": "not-json"}}]})

    async def call() -> dict:
        async with httpx.AsyncClient(
            base_url=settings.llm_base_url,
            transport=httpx.MockTransport(handler),
        ) as client:
            return await LLMService(client).generate_json("extract")

    with pytest.raises(RuntimeError, match="invalid JSON"):
        asyncio.run(call())
