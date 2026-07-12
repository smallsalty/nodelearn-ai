import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

import httpx
import pytest

from app.core.config import settings
from app.services.providers.iflytek.client import IflytekClient, PROVIDER_CALL_LOGS
from app.services.providers.iflytek.interface_service_chat import IflytekInterfaceServiceChatProvider
from app.services.providers.iflytek.tts import IflytekTtsProvider
from app.services.providers.iflytek.types import IflytekChatRequest


def run(coro):
    return asyncio.run(coro)


def test_interface_service_chat_never_falls_back_to_mock_without_credentials(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "enable_mock", True)
    monkeypatch.setattr(settings, "iflytek_enable_mock", True)
    monkeypatch.setattr(settings, "iflytek_api_key", "")
    monkeypatch.setattr(settings, "iflytek_api_secret", "")
    monkeypatch.setattr(settings, "iflytek_app_id", "")

    with pytest.raises(RuntimeError, match="IFLYTEK_APP_ID.*IFLYTEK_API_KEY.*IFLYTEK_API_SECRET"):
        run(
            IflytekInterfaceServiceChatProvider().chat(
                IflytekChatRequest(
                    user_id="user_iflytek_provider_001",
                    session_id="session_iflytek_provider_001",
                    course_id="course_ds_001",
                    node_id="node_stack_001",
                    message="解释栈",
                )
            )
        )


def test_iflytek_tts_request_failure_is_readable_and_logged(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "enable_mock", False)
    monkeypatch.setattr(settings, "iflytek_enable_mock", False)
    monkeypatch.setattr(settings, "iflytek_api_key", "key")
    monkeypatch.setattr(settings, "iflytek_api_secret", "secret")
    monkeypatch.setattr(settings, "iflytek_app_id", "app")
    monkeypatch.setattr(settings, "iflytek_base_url", "https://iflytek.test")
    PROVIDER_CALL_LOGS.clear()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"message": "provider failed"})

    async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = IflytekTtsProvider(IflytekClient(client=async_client))

    with pytest.raises(RuntimeError, match="HTTP 500"):
        run(provider.synthesize("测试文本", user_id="user_iflytek_provider_002"))

    run(async_client.aclose())
    assert PROVIDER_CALL_LOGS
    assert PROVIDER_CALL_LOGS[-1].success is False
    assert "HTTP 500" in (PROVIDER_CALL_LOGS[-1].error_message or "")
