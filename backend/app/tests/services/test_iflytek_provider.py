import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

import httpx
import pytest

from app.core.config import settings
from app.schemas.common import TaskStatus
from app.services.providers.iflytek.client import IflytekClient, PROVIDER_CALL_LOGS
from app.services.providers.iflytek.spark import IflytekSparkProvider
from app.services.providers.iflytek.tts import IflytekTtsProvider
from app.services.providers.iflytek.types import IflytekChatRequest


def run(coro):
    return asyncio.run(coro)


def test_iflytek_spark_returns_mock_without_real_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "enable_mock", False)
    monkeypatch.setattr(settings, "iflytek_enable_mock", False)
    monkeypatch.setattr(settings, "iflytek_api_key", "")
    monkeypatch.setattr(settings, "iflytek_api_secret", "")
    monkeypatch.setattr(settings, "iflytek_app_id", "")

    result = run(
        IflytekSparkProvider().chat(
            IflytekChatRequest(
                user_id="user_iflytek_provider_001",
                course_id="course_ds_001",
                node_id="node_stack_001",
                message="解释栈",
            )
        )
    )

    assert result.status == TaskStatus.success
    assert result.text
    assert result.raw_payload and result.raw_payload["mock"] is True


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
