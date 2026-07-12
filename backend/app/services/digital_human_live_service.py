from __future__ import annotations

import asyncio
import contextlib
import logging
import shutil
import time
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from app.schemas.common import TaskStatus
from app.schemas.multimodal import DigitalHumanLiveSessionResult
from app.services.providers.iflytek import IflytekDigitalHumanProvider
from app.services.providers.iflytek.client import sanitize_provider_error

logger = logging.getLogger(__name__)

HLS_SEGMENT_SECONDS = 1
HLS_WINDOW_SEGMENTS = 300
HLS_DELETE_THRESHOLD = 10
HLS_CLEANUP_DELAY_SECONDS = 600


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


GatewayExitCallback = Callable[[str, str], Awaitable[None]]


@dataclass(slots=True)
class HlsProcess:
    process: asyncio.subprocess.Process
    output_root: Path
    playlist_path: Path
    video_url: str
    stream_url: str
    transcode_video: bool = False
    ready: bool = False
    stopping: bool = False
    stderr_lines: deque[str] = field(default_factory=lambda: deque(maxlen=30))
    stderr_task: asyncio.Task[None] | None = None
    monitor_task: asyncio.Task[None] | None = None


class HlsStreamGateway:
    def __init__(self, on_unexpected_exit: GatewayExitCallback | None = None) -> None:
        self._processes: dict[str, HlsProcess] = {}
        self._cleanup_tasks: dict[str, asyncio.Task[None]] = {}
        self._on_unexpected_exit = on_unexpected_exit

    def set_exit_callback(self, callback: GatewayExitCallback) -> None:
        self._on_unexpected_exit = callback

    async def start(self, session_id: str, stream_url: str) -> HlsProcess:
        await self._cancel_cleanup(session_id)
        await self.stop(session_id, schedule_cleanup=False)
        output_root = self._output_root(session_id)
        output_root.mkdir(parents=True, exist_ok=True)
        self._remove_hls_files(output_root)
        return await self._spawn(session_id, stream_url, output_root, transcode_video=False)

    async def wait_ready(self, session_id: str) -> HlsProcess:
        deadline = time.monotonic() + settings.iflytek_digital_human_stream_ready_timeout_seconds
        attempted_fallback = False
        while time.monotonic() < deadline:
            handle = self._processes.get(session_id)
            if handle is None:
                raise RuntimeError("ffmpeg RTMP to HLS process is not running")
            if handle.playlist_path.exists() and handle.playlist_path.stat().st_size > 0:
                handle.ready = True
                return handle
            if handle.process.returncode is not None:
                error = self._process_error(handle)
                if not handle.transcode_video and not attempted_fallback:
                    attempted_fallback = True
                    stream_url = handle.stream_url
                    output_root = handle.output_root
                    await self._discard_handle(session_id, handle)
                    self._remove_hls_files(output_root)
                    await self._spawn(session_id, stream_url, output_root, transcode_video=True)
                    continue
                await self.stop(session_id)
                raise RuntimeError(f"ffmpeg RTMP to HLS failed: {sanitize_provider_error(error)}")
            await asyncio.sleep(0.2)
        handle = self._processes.get(session_id)
        error = self._process_error(handle) if handle is not None else "HLS process disappeared"
        await self.stop(session_id)
        if not error:
            error = "HLS playlist was not created before timeout"
        raise RuntimeError(f"ffmpeg RTMP to HLS failed: {sanitize_provider_error(error)}")

    async def stop(self, session_id: str, *, schedule_cleanup: bool = True) -> None:
        handle = self._processes.pop(session_id, None)
        if handle is not None:
            await self._terminate_handle(handle)
        if schedule_cleanup:
            self._schedule_cleanup(session_id)

    async def shutdown(self) -> None:
        session_ids = set(self._processes) | set(self._cleanup_tasks)
        for session_id in list(self._processes):
            await self.stop(session_id, schedule_cleanup=False)
        for task in list(self._cleanup_tasks.values()):
            task.cancel()
        for task in list(self._cleanup_tasks.values()):
            with contextlib.suppress(asyncio.CancelledError):
                await task
        self._cleanup_tasks.clear()
        for session_id in session_ids:
            shutil.rmtree(self._output_root(session_id), ignore_errors=True)

    async def _spawn(
        self,
        session_id: str,
        stream_url: str,
        output_root: Path,
        *,
        transcode_video: bool,
    ) -> HlsProcess:
        playlist_path = output_root / "index.m3u8"
        segment_pattern = output_root / "segment_%06d.ts"
        video_args = (
            ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency", "-g", "25", "-sc_threshold", "0"]
            if transcode_video
            else ["-c:v", "copy"]
        )
        command = [
            settings.ffmpeg_binary,
            "-hide_banner",
            "-loglevel",
            "warning",
            "-fflags",
            "nobuffer",
            "-flags",
            "low_delay",
            "-i",
            stream_url,
            "-map",
            "0:v:0",
            "-map",
            "0:a:0?",
            *video_args,
            "-c:a",
            "aac",
            "-f",
            "hls",
            "-hls_time",
            str(HLS_SEGMENT_SECONDS),
            "-hls_list_size",
            str(HLS_WINDOW_SEGMENTS),
            "-hls_delete_threshold",
            str(HLS_DELETE_THRESHOLD),
            "-hls_flags",
            "delete_segments+append_list+independent_segments+program_date_time+temp_file",
            "-hls_segment_filename",
            str(segment_pattern),
            str(playlist_path),
        ]
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        relative_path = playlist_path.relative_to(Path(settings.file_storage_path).resolve()).as_posix()
        handle = HlsProcess(
            process=process,
            output_root=output_root,
            playlist_path=playlist_path,
            video_url=f"{settings.file_storage_public_base_url.rstrip('/')}/{relative_path}",
            stream_url=stream_url,
            transcode_video=transcode_video,
        )
        handle.stderr_task = asyncio.create_task(self._drain_stderr(handle))
        handle.monitor_task = asyncio.create_task(self._monitor_exit(session_id, handle))
        self._processes[session_id] = handle
        return handle

    async def _monitor_exit(self, session_id: str, handle: HlsProcess) -> None:
        await handle.process.wait()
        if handle.stopping or not handle.ready or self._processes.get(session_id) is not handle:
            return
        error = sanitize_provider_error(self._process_error(handle) or "ffmpeg process exited unexpectedly")
        if self._on_unexpected_exit is not None:
            await self._on_unexpected_exit(session_id, error)

    async def _terminate_handle(self, handle: HlsProcess) -> None:
        handle.stopping = True
        if handle.process.returncode is None:
            handle.process.terminate()
            try:
                await asyncio.wait_for(handle.process.wait(), timeout=5)
            except TimeoutError:
                handle.process.kill()
                await handle.process.wait()
        current_task = asyncio.current_task()
        for task in (handle.stderr_task, handle.monitor_task):
            if task is None or task is current_task:
                continue
            if not task.done():
                task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task

    async def _discard_handle(self, session_id: str, handle: HlsProcess) -> None:
        if self._processes.get(session_id) is handle:
            self._processes.pop(session_id, None)
        await self._terminate_handle(handle)

    def _schedule_cleanup(self, session_id: str) -> None:
        previous = self._cleanup_tasks.pop(session_id, None)
        if previous is not None:
            previous.cancel()
        self._cleanup_tasks[session_id] = asyncio.create_task(self._cleanup_later(session_id))

    async def _cleanup_later(self, session_id: str) -> None:
        try:
            await asyncio.sleep(HLS_CLEANUP_DELAY_SECONDS)
            if session_id not in self._processes:
                shutil.rmtree(self._output_root(session_id), ignore_errors=True)
        except asyncio.CancelledError:
            return
        finally:
            current = asyncio.current_task()
            if self._cleanup_tasks.get(session_id) is current:
                self._cleanup_tasks.pop(session_id, None)

    async def _cancel_cleanup(self, session_id: str) -> None:
        task = self._cleanup_tasks.pop(session_id, None)
        if task is None:
            return
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    def _output_root(self, session_id: str) -> Path:
        storage_root = (Path(settings.file_storage_path).resolve() / "digital-human-live").resolve()
        output_root = (storage_root / session_id).resolve()
        if output_root.parent != storage_root:
            raise RuntimeError("invalid digital human live session id")
        return output_root

    @staticmethod
    def _remove_hls_files(output_root: Path) -> None:
        for pattern in ("index.m3u8", "segment_*.ts", "segment_*.m4s"):
            for path in output_root.glob(pattern):
                with contextlib.suppress(OSError):
                    path.unlink()

    @staticmethod
    def _process_error(handle: HlsProcess | None) -> str:
        if handle is None:
            return ""
        return " | ".join(line for line in handle.stderr_lines if line)

    @staticmethod
    async def _drain_stderr(handle: HlsProcess) -> None:
        if handle.process.stderr is None:
            return
        while True:
            line = await handle.process.stderr.readline()
            if not line:
                return
            handle.stderr_lines.append(line.decode("utf-8", errors="replace").strip())


@dataclass(slots=True)
class LiveSessionState:
    session_id: str
    user_id: str
    provider_session: str
    video_url: str
    status: TaskStatus
    started_at: str
    updated_at: str
    last_activity: float
    error_message: str | None = None
    heartbeat_task: asyncio.Task[None] | None = None
    provider_monitor_task: asyncio.Task[None] | None = None
    heartbeat_failures: int = 0


class DigitalHumanLiveService:
    def __init__(
        self,
        provider: IflytekDigitalHumanProvider | None = None,
        gateway: HlsStreamGateway | None = None,
    ) -> None:
        self.provider = provider or IflytekDigitalHumanProvider()
        self.gateway = gateway or HlsStreamGateway()
        if hasattr(self.gateway, "set_exit_callback"):
            self.gateway.set_exit_callback(self._handle_gateway_exit)
        self._sessions: dict[str, LiveSessionState] = {}
        self._session_locks: dict[str, asyncio.Lock] = {}

    async def speak(
        self,
        session_id: str,
        *,
        user_id: str,
        text: str,
        avatar_id: str | None = None,
        voice_id: str | None = None,
    ) -> DigitalHumanLiveSessionResult:
        self._validate_driver_text(text)
        async with self._lock_for(session_id):
            state = await self._ensure_session_locked(
                session_id,
                user_id=user_id,
                avatar_id=avatar_id,
                voice_id=voice_id,
            )
            try:
                await self.provider.drive_text(
                    provider_session=state.provider_session,
                    user_id=state.user_id,
                    text=text,
                    voice_id=voice_id,
                )
                await self.gateway.wait_ready(session_id)
                self._touch(state)
                return self._result(state)
            except Exception as exc:
                state.error_message = sanitize_provider_error(str(exc) or exc.__class__.__name__)
                await self._stop_locked(state, TaskStatus.failed)
                raise

    async def ensure_session(
        self,
        session_id: str,
        *,
        user_id: str,
        avatar_id: str | None = None,
        voice_id: str | None = None,
    ) -> DigitalHumanLiveSessionResult:
        async with self._lock_for(session_id):
            state = await self._ensure_session_locked(
                session_id,
                user_id=user_id,
                avatar_id=avatar_id,
                voice_id=voice_id,
            )
            return self._result(state)

    async def drive_text(
        self,
        session_id: str,
        *,
        text: str,
        voice_id: str | None = None,
    ) -> DigitalHumanLiveSessionResult:
        self._validate_driver_text(text)
        async with self._lock_for(session_id):
            state = self._require_running(session_id)
            try:
                await self.provider.drive_text(
                    provider_session=state.provider_session,
                    user_id=state.user_id,
                    text=text,
                    voice_id=voice_id,
                )
                await self.gateway.wait_ready(session_id)
                self._touch(state)
                return self._result(state)
            except Exception as exc:
                state.error_message = sanitize_provider_error(str(exc) or exc.__class__.__name__)
                await self._stop_locked(state, TaskStatus.failed)
                raise

    async def get_session(self, session_id: str) -> DigitalHumanLiveSessionResult:
        async with self._lock_for(session_id):
            state = self._sessions.get(session_id)
            if state is None:
                raise KeyError("digital human live session not found")
            return self._result(state)

    async def stop_session(self, session_id: str) -> DigitalHumanLiveSessionResult:
        async with self._lock_for(session_id):
            state = self._sessions.get(session_id)
            if state is None:
                raise KeyError("digital human live session not found")
            if state.status == TaskStatus.running:
                await self._stop_locked(state, TaskStatus.cancelled)
            return self._result(state)

    async def shutdown(self) -> None:
        for session_id in list(self._sessions):
            async with self._lock_for(session_id):
                state = self._sessions[session_id]
                if state.status == TaskStatus.running:
                    await self._stop_locked(state, TaskStatus.cancelled)
        with contextlib.suppress(Exception):
            await self.provider.shutdown()
        await self.gateway.shutdown()

    async def _ensure_session_locked(
        self,
        session_id: str,
        *,
        user_id: str,
        avatar_id: str | None,
        voice_id: str | None,
    ) -> LiveSessionState:
        existing = self._sessions.get(session_id)
        if existing is not None and existing.user_id != user_id:
            raise RuntimeError("digital human live session belongs to another user")
        if existing is not None and existing.status == TaskStatus.running:
            return existing
        started_at = now_iso()
        provider_session = await self.provider.start(
            user_id=user_id,
            avatar_id=avatar_id,
            voice_id=voice_id,
        )
        try:
            hls_process = await self.gateway.start(session_id, provider_session.stream_url)
            video_url = hls_process.video_url
        except Exception:
            with contextlib.suppress(Exception):
                await self.provider.stop(provider_session=provider_session.provider_session, user_id=user_id)
            raise
        state = LiveSessionState(
            session_id=session_id,
            user_id=user_id,
            provider_session=provider_session.provider_session,
            video_url=video_url,
            status=TaskStatus.running,
            started_at=started_at,
            updated_at=started_at,
            last_activity=time.monotonic(),
        )
        self._sessions[session_id] = state
        state.heartbeat_task = asyncio.create_task(self._heartbeat_loop(session_id))
        state.provider_monitor_task = asyncio.create_task(self._provider_monitor_loop(session_id))
        return state

    async def _provider_monitor_loop(self, session_id: str) -> None:
        state = self._sessions.get(session_id)
        if state is None:
            return
        try:
            await self.provider.wait_closed(state.provider_session)
            error = "Iflytek avatar WebSocket closed unexpectedly"
        except asyncio.CancelledError:
            return
        except Exception as exc:
            error = sanitize_provider_error(str(exc) or exc.__class__.__name__)
        async with self._lock_for(session_id):
            current = self._sessions.get(session_id)
            if current is not state or state.status != TaskStatus.running:
                return
            state.error_message = error
            await self._stop_locked(state, TaskStatus.failed)

    async def _heartbeat_loop(self, session_id: str) -> None:
        try:
            while True:
                await asyncio.sleep(settings.iflytek_digital_human_heartbeat_seconds)
                async with self._lock_for(session_id):
                    state = self._sessions.get(session_id)
                    if state is None or state.status != TaskStatus.running:
                        return
                    if time.monotonic() - state.last_activity >= settings.iflytek_digital_human_idle_timeout_seconds:
                        await self._stop_locked(state, TaskStatus.cancelled)
                        return
                    try:
                        await self.provider.ping(provider_session=state.provider_session, user_id=state.user_id)
                        state.heartbeat_failures = 0
                        state.updated_at = now_iso()
                    except Exception as exc:
                        state.heartbeat_failures += 1
                        error = sanitize_provider_error(str(exc) or exc.__class__.__name__)
                        logger.warning(
                            "iflytek_virtual_human_heartbeat_failed session=%s failures=%s error=%s",
                            session_id,
                            state.heartbeat_failures,
                            error,
                        )
                        if state.heartbeat_failures >= 2:
                            state.error_message = error
                            await self._stop_locked(state, TaskStatus.failed)
                            return
        except asyncio.CancelledError:
            return

    async def _handle_gateway_exit(self, session_id: str, error: str) -> None:
        async with self._lock_for(session_id):
            state = self._sessions.get(session_id)
            if state is None or state.status != TaskStatus.running:
                return
            state.error_message = error or "digital human HLS process stopped unexpectedly"
            await self._stop_locked(state, TaskStatus.failed)

    async def _stop_locked(self, state: LiveSessionState, status: TaskStatus) -> None:
        if state.status != TaskStatus.running:
            return
        current_task = asyncio.current_task()
        for task in (state.heartbeat_task, state.provider_monitor_task):
            if task is None or task is current_task:
                continue
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        state.heartbeat_task = None
        state.provider_monitor_task = None
        try:
            await self.provider.stop(provider_session=state.provider_session, user_id=state.user_id)
        except Exception as exc:
            error = sanitize_provider_error(str(exc) or exc.__class__.__name__)
            logger.warning("iflytek_avatar_stop_failed session=%s error=%s", state.session_id, error)
            if state.error_message is None:
                state.error_message = error
        await self.gateway.stop(state.session_id)
        state.status = status
        state.updated_at = now_iso()

    def _require_running(self, session_id: str) -> LiveSessionState:
        state = self._sessions.get(session_id)
        if state is None or state.status != TaskStatus.running:
            raise RuntimeError("digital human live session is not running")
        return state

    def _lock_for(self, session_id: str) -> asyncio.Lock:
        return self._session_locks.setdefault(session_id, asyncio.Lock())

    @staticmethod
    def _validate_driver_text(text: str) -> None:
        content = text.strip()
        if not content:
            raise RuntimeError("digital human driver text is empty")
        if len(content) > IflytekDigitalHumanProvider.MAX_DRIVER_TEXT_CHARACTERS:
            raise RuntimeError(
                "digital human driver text exceeds "
                f"{IflytekDigitalHumanProvider.MAX_DRIVER_TEXT_CHARACTERS} characters"
            )

    @staticmethod
    def _touch(state: LiveSessionState) -> None:
        state.last_activity = time.monotonic()
        state.updated_at = now_iso()

    @staticmethod
    def _result(state: LiveSessionState) -> DigitalHumanLiveSessionResult:
        return DigitalHumanLiveSessionResult(
            session_id=state.session_id,
            status=state.status,
            video_url=state.video_url,
            error_message=state.error_message,
            started_at=state.started_at,
            updated_at=state.updated_at,
        )


default_digital_human_live_service = DigitalHumanLiveService()
