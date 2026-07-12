import asyncio

import pytest

from app.schemas.common import AuditStatus, TaskStatus
from app.schemas.multimodal import DigitalHumanChatRequest, DigitalHumanLiveSessionResult
from app.services.multimodal_service import MultimodalRepository, MultimodalService
from app.services.providers.iflytek.types import IflytekProviderResult


def run(coro):
    return asyncio.run(coro)


class RecordingInterfaceChatProvider:
    def __init__(self, events: list[str], *, error: Exception | None = None) -> None:
        self.events = events
        self.error = error

    async def chat(self, _payload):
        self.events.append("model")
        if self.error:
            raise self.error
        return IflytekProviderResult(
            provider_task_id="chat***sid",
            status=TaskStatus.success,
            text="栈是一种后进先出的线性结构。",
        )


class RecordingAuditService:
    def __init__(self, events: list[str], status: AuditStatus = AuditStatus.passed) -> None:
        self.events = events
        self.status = status

    async def check_content(self, **_kwargs):
        self.events.append("audit")
        return type("AuditResult", (), {"audit_status": self.status, "reason": "审核拒绝"})()


class RecordingLiveService:
    def __init__(self, events: list[str]) -> None:
        self.events = events

    async def speak(self, session_id: str, **_kwargs):
        self.events.append("virtual-human")
        return DigitalHumanLiveSessionResult(
            session_id=session_id,
            status=TaskStatus.running,
            video_url=f"http://localhost:8000/storage/digital-human-live/{session_id}/index.m3u8",
            started_at="2026-07-11T00:00:00+00:00",
            updated_at="2026-07-11T00:00:00+00:00",
        )


def request() -> DigitalHumanChatRequest:
    return DigitalHumanChatRequest(
        user_id="user-order-001",
        course_id="course_ds_001",
        node_id="node_stack_001",
        message="什么是栈？",
        use_rag=True,
        use_profile=True,
    )


def test_model_failure_never_starts_virtual_human():
    events: list[str] = []
    service = MultimodalService(
        repository=MultimodalRepository(),
        interface_chat_provider=RecordingInterfaceChatProvider(events, error=RuntimeError("11200 AppIdNoAuthError")),
        audit_service=RecordingAuditService(events),
        live_service=RecordingLiveService(events),
    )

    with pytest.raises(RuntimeError, match="11200 AppIdNoAuthError"):
        run(service.chat(request()))

    assert events == ["model"]


def test_audit_rejection_does_not_drive_virtual_human():
    events: list[str] = []
    service = MultimodalService(
        repository=MultimodalRepository(),
        interface_chat_provider=RecordingInterfaceChatProvider(events),
        audit_service=RecordingAuditService(events, AuditStatus.need_review),
        live_service=RecordingLiveService(events),
    )

    result = run(service.chat(request()))

    assert events == ["model", "audit"]
    assert result.status == TaskStatus.failed
    assert result.live_session is None


def test_virtual_human_starts_only_after_model_and_audit_succeed():
    events: list[str] = []
    service = MultimodalService(
        repository=MultimodalRepository(),
        interface_chat_provider=RecordingInterfaceChatProvider(events),
        audit_service=RecordingAuditService(events),
        live_service=RecordingLiveService(events),
    )

    result = run(service.chat(request()))

    assert events == ["model", "audit", "virtual-human"]
    assert result.status == TaskStatus.success
    assert result.live_session is not None
