import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.schemas.common import TaskStatus
from app.services import digital_human_live_service as live_module
from app.services.digital_human_live_service import DigitalHumanLiveService, HlsStreamGateway
from app.services.providers.iflytek.types import IflytekVirtualHumanCommandResult, IflytekVirtualHumanSession


def run(coro):
    return asyncio.run(coro)


class FakeProvider:
    def __init__(self) -> None:
        self.client = SimpleNamespace(mock_enabled=False)
        self.start_calls = 0
        self.drive_calls: list[str] = []
        self.ping_calls = 0
        self.stop_calls = 0
        self.fail_ping = False
        self.active_drives = 0
        self.max_active_drives = 0
        self.closed_event = asyncio.Event()
        self.close_error: Exception | None = None

    async def start(self, *, user_id: str, avatar_id: str | None = None, voice_id: str | None = None):
        self.start_calls += 1
        self.closed_event = asyncio.Event()
        return IflytekVirtualHumanSession(providerSession="provider-session", streamUrl="rtmp://example/live/stream", sid="start-sid")

    async def drive_text(self, *, provider_session: str, user_id: str, text: str, voice_id: str | None = None):
        self.active_drives += 1
        self.max_active_drives = max(self.max_active_drives, self.active_drives)
        await asyncio.sleep(0.005)
        self.drive_calls.append(text)
        self.active_drives -= 1
        return IflytekVirtualHumanCommandResult(providerSession=provider_session, sid="drive-sid")

    async def ping(self, *, provider_session: str, user_id: str):
        self.ping_calls += 1
        if self.fail_ping:
            raise RuntimeError("ping failed sid=vms-sensitive-session-123456")
        return IflytekVirtualHumanCommandResult(providerSession=provider_session, sid="ping-sid")

    async def stop(self, *, provider_session: str, user_id: str):
        self.stop_calls += 1
        self.closed_event.set()
        return IflytekVirtualHumanCommandResult(providerSession=provider_session, sid="stop-sid")

    async def wait_closed(self, _provider_session: str):
        await self.closed_event.wait()
        if self.close_error:
            raise self.close_error

    async def shutdown(self):
        self.closed_event.set()

    async def disconnect(self, error: str = "provider connection lost"):
        self.close_error = RuntimeError(error)
        self.closed_event.set()


class FakeGateway:
    def __init__(self) -> None:
        self.start_calls = 0
        self.stop_calls = 0
        self.wait_ready_calls = 0
        self.exit_callback = None
        self._processes = {"session-001": SimpleNamespace(process=SimpleNamespace(returncode=None))}

    def set_exit_callback(self, callback):
        self.exit_callback = callback

    async def start(self, session_id: str, stream_url: str):
        self.start_calls += 1
        self._processes[session_id] = SimpleNamespace(process=SimpleNamespace(returncode=None))
        return SimpleNamespace(video_url=f"http://localhost:8000/storage/digital-human-live/{session_id}/index.m3u8")

    async def stop(self, session_id: str):
        self.stop_calls += 1
        self._processes.pop(session_id, None)

    async def wait_ready(self, session_id: str):
        self.wait_ready_calls += 1
        return SimpleNamespace(video_url=f"http://localhost:8000/storage/digital-human-live/{session_id}/index.m3u8")

    async def shutdown(self):
        self._processes.clear()


def test_live_session_reuses_provider_and_stops_cleanly(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "iflytek_digital_human_heartbeat_seconds", 3600)
    provider = FakeProvider()
    gateway = FakeGateway()
    service = DigitalHumanLiveService(provider=provider, gateway=gateway)

    async def scenario():
        first = await service.ensure_session("session-001", user_id="user-001", avatar_id="avatar")
        second = await service.ensure_session("session-001", user_id="user-001", avatar_id="avatar")
        driven = await service.drive_text("session-001", text="解释栈", voice_id="voice")
        stopped = await service.stop_session("session-001")
        stopped_again = await service.stop_session("session-001")
        return first, second, driven, stopped, stopped_again

    first, second, driven, stopped, stopped_again = run(scenario())
    assert first.video_url.endswith("index.m3u8")
    assert second.session_id == first.session_id
    assert driven.status == TaskStatus.running
    assert stopped.status == TaskStatus.cancelled
    assert stopped_again.status == TaskStatus.cancelled
    assert provider.start_calls == 1
    assert gateway.start_calls == 1
    assert provider.drive_calls == ["解释栈"]
    assert provider.stop_calls == 1
    assert gateway.stop_calls == 1


def test_live_session_serializes_multi_turn_speech(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "iflytek_digital_human_heartbeat_seconds", 3600)
    provider = FakeProvider()
    gateway = FakeGateway()
    service = DigitalHumanLiveService(provider=provider, gateway=gateway)

    async def scenario():
        await asyncio.gather(
            service.speak("session-serial", user_id="user-001", text="第一轮"),
            service.speak("session-serial", user_id="user-001", text="第二轮"),
        )
        await service.stop_session("session-serial")

    run(scenario())
    assert provider.start_calls == 1
    assert provider.max_active_drives == 1
    assert provider.drive_calls == ["第一轮", "第二轮"]


def test_live_session_stops_after_two_heartbeat_failures(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "iflytek_digital_human_heartbeat_seconds", 0.01)
    monkeypatch.setattr(settings, "iflytek_digital_human_idle_timeout_seconds", 60)
    provider = FakeProvider()
    provider.fail_ping = True
    gateway = FakeGateway()
    service = DigitalHumanLiveService(provider=provider, gateway=gateway)

    async def scenario():
        await service.ensure_session("session-heartbeat", user_id="user-001")
        await asyncio.sleep(0.05)
        return await service.get_session("session-heartbeat")

    result = run(scenario())
    assert result.status == TaskStatus.failed
    assert provider.ping_calls == 2
    assert "vms-sensitive-session-123456" not in (result.error_message or "")
    assert provider.stop_calls == 1
    assert gateway.stop_calls == 1


def test_live_session_reacts_to_ffmpeg_exit_without_polling(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "iflytek_digital_human_heartbeat_seconds", 3600)
    provider = FakeProvider()
    gateway = FakeGateway()
    service = DigitalHumanLiveService(provider=provider, gateway=gateway)

    async def scenario():
        await service.ensure_session("session-exit", user_id="user-001")
        assert gateway.exit_callback is not None
        await gateway.exit_callback("session-exit", "ffmpeg exited")
        return await service.get_session("session-exit")

    result = run(scenario())
    assert result.status == TaskStatus.failed
    assert result.error_message == "ffmpeg exited"
    assert provider.stop_calls == 1
    assert gateway.stop_calls == 1


def test_live_session_reacts_to_provider_disconnect_without_polling(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "iflytek_digital_human_heartbeat_seconds", 3600)
    provider = FakeProvider()
    gateway = FakeGateway()
    service = DigitalHumanLiveService(provider=provider, gateway=gateway)

    async def scenario():
        await service.ensure_session("session-provider-exit", user_id="user-001")
        await provider.disconnect("provider disconnected sid=provider-sensitive-sid-123456")
        await asyncio.sleep(0)
        await asyncio.sleep(0)
        return await service.get_session("session-provider-exit")

    result = run(scenario())
    assert result.status == TaskStatus.failed
    assert "provider-sensitive-sid-123456" not in (result.error_message or "")
    assert provider.stop_calls == 1
    assert gateway.stop_calls == 1


def test_live_session_rejects_oversized_text_before_provider_start():
    provider = FakeProvider()
    gateway = FakeGateway()
    service = DigitalHumanLiveService(provider=provider, gateway=gateway)

    with pytest.raises(RuntimeError, match="2000"):
        run(service.speak("session-too-long", user_id="user-001", text="超" * 2001))

    assert provider.start_calls == 0
    assert gateway.start_calls == 0


def test_live_session_idle_timeout_releases_provider(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "iflytek_digital_human_heartbeat_seconds", 0.01)
    monkeypatch.setattr(settings, "iflytek_digital_human_idle_timeout_seconds", 0.01)
    provider = FakeProvider()
    gateway = FakeGateway()
    service = DigitalHumanLiveService(provider=provider, gateway=gateway)

    async def scenario():
        await service.ensure_session("session-idle", user_id="user-001")
        await asyncio.sleep(0.05)
        return await service.get_session("session-idle")

    result = run(scenario())
    assert result.status == TaskStatus.cancelled
    assert provider.stop_calls == 1
    assert gateway.stop_calls == 1


def test_hls_gateway_uses_rolling_window_and_delayed_cleanup(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    monkeypatch.setattr(settings, "file_storage_path", str(tmp_path))
    monkeypatch.setattr(settings, "file_storage_public_base_url", "http://localhost:8000/storage")
    monkeypatch.setattr(live_module, "HLS_CLEANUP_DELAY_SECONDS", 0.01)
    commands: list[list[str]] = []

    class FakeStderr:
        async def readline(self):
            return b""

    class FakeProcess:
        def __init__(self):
            self.returncode = None
            self.stderr = FakeStderr()
            self._finished = asyncio.Event()

        async def wait(self):
            await self._finished.wait()
            return self.returncode

        def terminate(self):
            self.returncode = 0
            self._finished.set()

        def kill(self):
            self.terminate()

    async def fake_subprocess(*args, **_kwargs):
        commands.append([str(arg) for arg in args])
        return FakeProcess()

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_subprocess)

    async def scenario():
        gateway = HlsStreamGateway()
        await gateway.start("session-hls", "rtmp://provider.invalid/live")
        output_root = tmp_path / "digital-human-live" / "session-hls"
        (output_root / "index.m3u8").write_text("#EXTM3U", encoding="utf-8")
        await gateway.stop("session-hls")
        assert output_root.exists()
        await asyncio.sleep(0.03)
        await gateway.shutdown()
        return output_root

    output_root = run(scenario())
    assert commands
    command = commands[0]
    assert command[command.index("-hls_list_size") + 1] == str(live_module.HLS_WINDOW_SEGMENTS)
    assert "delete_segments" in command[command.index("-hls_flags") + 1]
    assert not output_root.exists()
