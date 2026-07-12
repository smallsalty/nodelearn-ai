import asyncio
import base64
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest

from app.core.config import settings
from app.services.providers.iflytek.client import IflytekClient, mask_provider_sid, sanitize_provider_error
from app.services.providers.iflytek.digital_human import IflytekDigitalHumanProvider
from app.services.providers.iflytek.interface_service_chat import IflytekInterfaceServiceChatProvider
from app.services.providers.iflytek.types import IflytekChatRequest


def run(coro):
    return asyncio.run(coro)


def configure_real_iflytek(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "enable_mock", False)
    monkeypatch.setattr(settings, "iflytek_enable_mock", False)
    monkeypatch.setattr(settings, "iflytek_app_id", "app12345")
    monkeypatch.setattr(settings, "iflytek_api_key", "k" * 32)
    monkeypatch.setattr(settings, "iflytek_api_secret", "s" * 32)
    monkeypatch.setattr(settings, "iflytek_digital_human_chat_url", "wss://apigateway.xfyousheng.com/nlp/v1/interact_nlp")
    monkeypatch.setattr(settings, "iflytek_digital_human_service_id", "327989583537115136")
    monkeypatch.setattr(
        settings,
        "iflytek_digital_human_url",
        "wss://avatar.cn-huadong-1.xf-yun.com/v1/interact",
    )
    monkeypatch.setattr(settings, "iflytek_digital_human_avatar_id", "201165002")
    monkeypatch.setattr(settings, "iflytek_digital_human_voice_id", "x4_lingxiaoxuan_oral")


def test_signed_url_uses_fixed_hmac_parameters_without_exposing_secret(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    signed = IflytekClient().build_signed_url(
        "GET",
        "wss://avatar.cn-huadong-1.xf-yun.com/v1/interact",
        now=datetime(2026, 7, 11, 8, 30, tzinfo=UTC),
    )
    parsed = urlparse(signed)
    query = parse_qs(parsed.query)
    authorization = base64.b64decode(query["authorization"][0]).decode("utf-8")

    assert parsed.path == "/v1/interact"
    assert query["host"] == ["avatar.cn-huadong-1.xf-yun.com"]
    assert query["date"] == ["Sat, 11 Jul 2026 08:30:00 GMT"]
    assert 'api_key="' + "k" * 32 + '"' in authorization
    assert "hmac-sha256" in authorization
    assert 'signature="MY6MS6GnAJc6Dk25c1oyIutKnm/V+b/h/sla37I/Lpc="' in authorization
    assert "s" * 32 not in signed
    assert sanitize_provider_error(f"authorization=secret&api_secret={'s' * 32}") == "authorization=***&api_secret=***"
    assert sanitize_provider_error("failed input rtmp://provider.example/live/private-token") == "failed input rtmp://***"

    chat_signed = IflytekClient().build_signed_url(
        "GET",
        "wss://apigateway.xfyousheng.com/nlp/v1/interact_nlp",
        now=datetime(2026, 7, 11, 8, 30, tzinfo=UTC),
    )
    chat_parsed = urlparse(chat_signed)
    chat_query = parse_qs(chat_parsed.query)
    chat_authorization = base64.b64decode(chat_query["authorization"][0]).decode("utf-8")
    assert chat_parsed.netloc == "apigateway.xfyousheng.com"
    assert chat_parsed.path == "/nlp/v1/interact_nlp"
    assert 'signature="3cYVMrB3kDWpgroHVGYHYvtfTfg4f8zibxm600Ld0sw="' in chat_authorization
    assert "s" * 32 not in chat_signed


def test_provider_logs_never_expose_api_key_or_secret(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture):
    configure_real_iflytek(monkeypatch)
    caplog.set_level(logging.WARNING)

    IflytekClient().log_call(
        model_name="iflytek-interface-service:test",
        success=False,
        latency_ms=1,
        error_message=f"api_key={'k' * 32}&api_secret={'s' * 32}",
    )

    assert "k" * 32 not in caplog.text
    assert "s" * 32 not in caplog.text
    assert "api_key=***" in caplog.text
    assert "api_secret=***" in caplog.text


class FakeAvatarWebSocket:
    def __init__(self, *, start_error: dict | None = None) -> None:
        self.sent: list[dict] = []
        self.responses: asyncio.Queue[str | Exception] = asyncio.Queue()
        self.closed = False
        self.start_error = start_error

    async def send(self, value: str) -> None:
        payload = json.loads(value)
        self.sent.append(payload)
        header = payload["header"]
        request_id = header["request_id"]
        ctrl = header["ctrl"]
        if ctrl == "start":
            response = self.start_error or {
                "header": {"code": 0, "message": "success", "sid": "avatar-sensitive-sid-123456", "session": "server-session"},
                "payload": {"avatar": {"event_type": "stream_info", "stream_url": "rtmp://provider.example/live/private-token"}},
            }
        elif ctrl == "text_driver":
            response = {
                "header": {"code": 0, "message": "success", "sid": "driver-sid"},
                "payload": {"avatar": {"request_id": request_id, "event_type": "driver_status", "vmr_status": 0, "error_code": 0}},
            }
        elif ctrl == "ping":
            response = {"header": {"code": 0, "message": "success", "sid": "ping-sid"}, "payload": {}}
        else:
            response = {
                "header": {"code": 0, "message": "success", "sid": "stop-sid"},
                "payload": {"avatar": {"request_id": request_id, "event_type": "stream_stop", "error_code": 0}},
            }
        await self.responses.put(json.dumps(response))

    async def recv(self) -> str:
        response = await self.responses.get()
        if isinstance(response, Exception):
            raise response
        return response

    async def close(self) -> None:
        self.closed = True

    async def disconnect(self, message: str = "connection lost") -> None:
        await self.responses.put(RuntimeError(message))


def test_virtual_human_new_protocol_uses_one_websocket_and_official_shapes(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    websocket = FakeAvatarWebSocket()
    provider = IflytekDigitalHumanProvider(websocket_factory=lambda *_args, **_kwargs: websocket)

    async def scenario():
        session = await provider.start(user_id="user-001")
        await provider.drive_text(
            provider_session=session.provider_session,
            user_id="user-001",
            text="解释栈。",
        )
        await provider.ping(provider_session=session.provider_session, user_id="user-001")
        await provider.stop(provider_session=session.provider_session, user_id="user-001")
        await provider.stop(provider_session=session.provider_session, user_id="user-001")
        return session

    session = run(scenario())
    assert session.stream_url == "rtmp://provider.example/live/private-token"
    assert [item["header"]["ctrl"] for item in websocket.sent] == ["start", "text_driver", "ping", "stop"]
    start_payload, driver_payload, ping_payload, stop_payload = websocket.sent
    assert start_payload["header"]["scene_id"] == "327989583537115136"
    assert start_payload["parameter"]["avatar"] == {
        "stream": {"protocol": "rtmp"},
        "avatar_id": "201165002",
        "width": 1280,
        "height": 720,
    }
    assert start_payload["parameter"]["tts"]["vcn"] == "x4_lingxiaoxuan_oral"
    assert "avatar_type" not in start_payload["parameter"]["avatar"]
    assert driver_payload["parameter"]["avatar_dispatch"]["interactive_mode"] == 0
    assert driver_payload["parameter"]["tts"]["vcn"] == "x4_lingxiaoxuan_oral"
    assert driver_payload["payload"]["text"]["content"] == "解释栈。"
    assert "text" not in driver_payload["payload"]["text"]
    assert set(ping_payload) == {"header"}
    assert set(stop_payload) == {"header"}
    assert websocket.closed is True


def test_virtual_human_logs_mask_sensitive_values(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture):
    configure_real_iflytek(monkeypatch)
    caplog.set_level(logging.INFO)
    websocket = FakeAvatarWebSocket()
    provider = IflytekDigitalHumanProvider(websocket_factory=lambda *_args, **_kwargs: websocket)

    async def scenario():
        session = await provider.start(user_id="user-001")
        await provider.stop(provider_session=session.provider_session, user_id="user-001")

    run(scenario())
    assert "avatarId=201165002" in caplog.text
    assert "host=avatar.cn-huadong-1.xf-yun.com" in caplog.text
    assert "avatar-sensitive-sid-123456" not in caplog.text
    assert "server-session" not in caplog.text
    assert "private-token" not in caplog.text
    assert "k" * 32 not in caplog.text
    assert "s" * 32 not in caplog.text


def test_virtual_human_business_error_is_not_retried_and_masks_sid(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    factory_calls = 0
    websocket = FakeAvatarWebSocket(
        start_error={
            "header": {
                "code": 10005,
                "message": "avatar busy",
                "sid": "avatar-sensitive-sid-123456",
            }
        }
    )

    def factory(*_args, **_kwargs):
        nonlocal factory_calls
        factory_calls += 1
        return websocket

    provider = IflytekDigitalHumanProvider(websocket_factory=factory)
    with pytest.raises(RuntimeError) as exc_info:
        run(provider.start(user_id="user-001"))
    assert factory_calls == 1
    assert "10005" in str(exc_info.value)
    assert "avatar-sensitive-sid-123456" not in str(exc_info.value)
    assert websocket.closed is True


def test_virtual_human_connection_close_is_observable(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    websocket = FakeAvatarWebSocket()
    provider = IflytekDigitalHumanProvider(websocket_factory=lambda *_args, **_kwargs: websocket)

    async def scenario():
        session = await provider.start(user_id="user-001")
        await websocket.disconnect("connection lost sid=avatar-sensitive-sid-123456")
        with pytest.raises(RuntimeError) as exc_info:
            await provider.wait_closed(session.provider_session)
        await provider.stop(provider_session=session.provider_session, user_id="user-001")
        return str(exc_info.value)

    message = run(scenario())
    assert "avatar-sensitive-sid-123456" not in message


def test_virtual_human_rejects_empty_or_oversized_text_before_send(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    websocket = FakeAvatarWebSocket()
    provider = IflytekDigitalHumanProvider(websocket_factory=lambda *_args, **_kwargs: websocket)

    async def scenario():
        session = await provider.start(user_id="user-001")
        with pytest.raises(RuntimeError, match="empty"):
            await provider.drive_text(provider_session=session.provider_session, user_id="user-001", text="")
        with pytest.raises(RuntimeError, match="2000"):
            await provider.drive_text(provider_session=session.provider_session, user_id="user-001", text="超" * 2001)
        await provider.stop(provider_session=session.provider_session, user_id="user-001")

    run(scenario())
    assert [item["header"]["ctrl"] for item in websocket.sent] == ["start", "stop"]


def test_live_avatar_sources_do_not_reference_legacy_vms_protocol():
    backend_root = Path(__file__).resolve().parents[3]
    sources = "\n".join(
        (backend_root / relative_path).read_text(encoding="utf-8")
        for relative_path in (
            "app/services/providers/iflytek/digital_human.py",
            "app/smoke/real_iflytek_virtual_human_start.py",
            "app/core/config.py",
            ".env.example",
        )
    ).lower()
    assert "vms2d_" not in sources
    assert "vms.cn-huadong" not in sources
    assert "iflytek_digital_human_base_url" not in sources
    assert "spark-api" not in sources


class FakeWebSocket:
    def __init__(self) -> None:
        self.sent: dict | None = None
        self.responses = [
            json.dumps(
                {
                    "header": {"code": 0, "sid": "chat-sid", "session": "provider-session"},
                    "payload": {
                        "nlp": {
                            "error_code": 0,
                            "status": 0,
                            "answer": {"text": "栈是"},
                        }
                    },
                }
            ),
            json.dumps(
                {
                    "header": {"code": 0, "sid": "chat-sid", "session": "provider-session"},
                    "payload": {
                        "nlp": {
                            "error_code": 0,
                            "status": 2,
                            "answer": {"text": "后进先出的结构。"},
                        }
                    },
                }
            ),
        ]

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    async def send(self, value: str) -> None:
        self.sent = json.loads(value)

    async def recv(self) -> str:
        return self.responses.pop(0)


def test_interface_service_chat_aggregates_chunks_and_uses_service_id(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    websocket = FakeWebSocket()
    provider = IflytekInterfaceServiceChatProvider(websocket_factory=lambda *_args, **_kwargs: websocket)
    result = run(
        provider.chat(
            IflytekChatRequest(
                user_id="user-001",
                session_id="session-001",
                course_id="course_ds_001",
                node_id="node_stack_001",
                message="栈是什么？",
                profile_summary="喜欢例子",
                documents=[{"id": "doc-1", "sourceId": "source-1", "title": "栈", "content": "栈只允许在一端操作。", "score": 1.0}],
            )
        )
    )

    assert result.text == "栈是后进先出的结构。"
    assert result.provider_task_id == mask_provider_sid("chat-sid")
    assert websocket.sent is not None
    assert websocket.sent["header"]["app_id"] == "app12345"
    assert websocket.sent["header"]["uid"] == "user-001"
    assert websocket.sent["header"]["ctrl"] == "text_interact"
    assert websocket.sent["header"]["scene_id"] == "327989583537115136"
    assert websocket.sent["header"]["scene_version"] == "1"
    assert websocket.sent["header"]["session"] == ""
    assert websocket.sent["header"]["request_id"]
    assert websocket.sent["parameter"] == {
        "avatar_dispatch": {
            "interactive_mode": 1,
            "enable_action_status": 1,
            "content_analysis": 0,
        },
        "tts": {
            "vcn": "",
            "speed": 50,
            "pitch": 50,
            "volume": 100,
            "audio": {"sample_rate": 16000},
        },
        "air": {"air": 0, "add_nonsemantic": 0},
    }
    prompt = websocket.sent["payload"]["text"]["content"]
    assert "栈只允许在一端操作" in prompt
    assert "喜欢例子" in prompt
    assert len(prompt) <= provider.PROMPT_CHARACTER_BUDGET
    serialized = json.dumps(websocket.sent, ensure_ascii=False)
    assert "tools" not in serialized
    assert "patch_id" not in serialized
    assert "lite" not in serialized.lower()
    assert "deepseek" not in serialized.lower()


def test_interface_service_prompt_preserves_question_and_trims_optional_context(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    provider = IflytekInterfaceServiceChatProvider()
    question = "请解释哈希冲突的三种解决方法。"
    request = provider._build_request(
        IflytekChatRequest(
            user_id="user-001",
            session_id="session-hash",
            node_id="node-hash",
            message=question,
            profile_summary="偏好案例" * 1000,
            documents=[
                {"id": f"doc-{index}", "sourceId": "source", "title": f"材料{index}", "content": "课程材料" * 3000, "score": 1.0}
                for index in range(5)
            ],
        )
    )
    prompt = request["payload"]["text"]["content"]
    assert question in prompt
    assert prompt.startswith("你是 NodeLearn AI")
    assert prompt.endswith("控制在300字以内。")
    assert len(prompt) <= provider.PROMPT_CHARACTER_BUDGET


def test_interface_service_chat_reuses_provider_session_for_same_business_session(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    websockets = [FakeWebSocket(), FakeWebSocket()]
    created: list[FakeWebSocket] = []

    def factory(*_args, **_kwargs):
        websocket = websockets.pop(0)
        created.append(websocket)
        return websocket

    provider = IflytekInterfaceServiceChatProvider(websocket_factory=factory)
    for question in ("第一轮", "第二轮"):
        run(
            provider.chat(
                IflytekChatRequest(
                    user_id="user-001",
                    session_id="session-reuse",
                    message=question,
                )
            )
        )

    assert created[0].sent is not None
    assert created[1].sent is not None
    assert created[0].sent["header"]["session"] == ""
    assert created[1].sent["header"]["session"] == "provider-session"


def test_interface_service_chat_preserves_11200_and_masks_sid(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)

    class UnauthorizedWebSocket(FakeWebSocket):
        def __init__(self) -> None:
            super().__init__()
            self.responses = [
                json.dumps(
                    {
                        "header": {
                            "code": 11200,
                            "message": "AppIdNoAuthError",
                            "sid": "sensitive-provider-sid-123456",
                            "status": 2,
                        }
                    }
                )
            ]

    websocket = UnauthorizedWebSocket()
    provider = IflytekInterfaceServiceChatProvider(websocket_factory=lambda *_args, **_kwargs: websocket)
    with pytest.raises(RuntimeError) as exc_info:
        run(
            provider.chat(
                IflytekChatRequest(
                    user_id="user-001",
                    session_id="session-11200",
                    message="测试接口服务授权",
                )
            )
        )

    message = str(exc_info.value)
    assert "11200" in message
    assert "AppIdNoAuthError" in message
    assert "sensitive-provider-sid-123456" not in message
    assert mask_provider_sid("sensitive-provider-sid-123456") in message


def test_interface_service_chat_requires_business_code_and_does_not_retry(monkeypatch: pytest.MonkeyPatch):
    configure_real_iflytek(monkeypatch)
    calls = 0

    class InvalidWebSocket(FakeWebSocket):
        def __init__(self) -> None:
            super().__init__()
            self.responses = [json.dumps({"header": {"message": "missing code", "status": 2}})]

    def factory(*_args, **_kwargs):
        nonlocal calls
        calls += 1
        return InvalidWebSocket()

    provider = IflytekInterfaceServiceChatProvider(websocket_factory=factory)
    with pytest.raises(RuntimeError, match="missing header.code"):
        run(
            provider.chat(
                IflytekChatRequest(
                    user_id="user-001",
                    session_id="session-invalid",
                    message="测试响应结构",
                )
            )
        )

    assert calls == 1
