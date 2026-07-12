from __future__ import annotations

import asyncio
import contextlib
import inspect
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import urlparse
from uuid import uuid4

import websockets

from app.core.config import settings
from app.schemas.common import TaskStatus
from app.services.providers.iflytek.client import (
    IflytekClient,
    mask_provider_credential,
    mask_provider_sid,
    sanitize_provider_error,
)
from app.services.providers.iflytek.types import (
    IflytekDigitalHumanRequest,
    IflytekProviderResult,
    IflytekVirtualHumanCommandResult,
    IflytekVirtualHumanSession,
)

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class _PendingAvatarCommand:
    request_id: str
    ctrl: str
    future: asyncio.Future[dict[str, Any]]


@dataclass(slots=True)
class _AvatarConnection:
    handle: str
    websocket: Any
    context_manager: Any | None = None
    command_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    pending: dict[str, _PendingAvatarCommand] = field(default_factory=dict)
    closed_event: asyncio.Event = field(default_factory=asyncio.Event)
    reader_task: asyncio.Task[None] | None = None
    sid: str = ""
    server_session: str = ""
    close_error: str | None = None
    stop_requested: bool = False
    closing: bool = False


class IflytekDigitalHumanProvider:
    """Online avatar driver published with an iFlytek virtual-human interface service."""

    MAX_DRIVER_TEXT_CHARACTERS = 2000
    STOP_ACK_TIMEOUT_SECONDS = 5

    def __init__(
        self,
        client: IflytekClient | None = None,
        websocket_factory: Callable[..., Any] | None = None,
    ) -> None:
        self.client = client or IflytekClient()
        self.websocket_factory = websocket_factory or websockets.connect
        self._connections: dict[str, _AvatarConnection] = {}

    async def start(
        self,
        *,
        user_id: str,
        avatar_id: str | None = None,
        voice_id: str | None = None,
    ) -> IflytekVirtualHumanSession:
        del user_id  # The interface-service start protocol doesn't define uid.
        self._validate_configuration()
        selected_avatar_id = (avatar_id or settings.iflytek_digital_human_avatar_id).strip()
        selected_voice_id = (voice_id or settings.iflytek_digital_human_voice_id).strip()
        if not selected_avatar_id:
            raise RuntimeError("IFLYTEK_DIGITAL_HUMAN_AVATAR_ID is not configured")
        if not selected_voice_id:
            raise RuntimeError("IFLYTEK_DIGITAL_HUMAN_VOICE_ID is not configured")

        endpoint = urlparse(settings.iflytek_digital_human_url)
        started = time.perf_counter()
        logger.info(
            "iflytek_avatar_request host=%s path=%s ctrl=start appId=%s serviceId=%s avatarId=%s",
            endpoint.netloc,
            endpoint.path,
            mask_provider_credential(settings.iflytek_app_id),
            settings.iflytek_digital_human_service_id,
            selected_avatar_id,
        )
        state: _AvatarConnection | None = None
        try:
            signed_url = self.client.build_signed_url("GET", settings.iflytek_digital_human_url)
            websocket, context_manager = await self._open_websocket(signed_url)
            handle = f"iflytek_avatar_{uuid4().hex}"
            state = _AvatarConnection(handle=handle, websocket=websocket, context_manager=context_manager)
            self._connections[handle] = state
            state.reader_task = asyncio.create_task(self._reader_loop(state))
            request_id = uuid4().hex
            response = await self._send_and_wait(
                state,
                request_id=request_id,
                ctrl="start",
                payload={
                    "header": {
                        "app_id": settings.iflytek_app_id,
                        "ctrl": "start",
                        "request_id": request_id,
                        "scene_id": settings.iflytek_digital_human_service_id,
                    },
                    "parameter": {
                        "avatar": {
                            "stream": {"protocol": "rtmp"},
                            "avatar_id": selected_avatar_id,
                            "width": 1280,
                            "height": 720,
                        },
                        "tts": self._tts_parameters(selected_voice_id),
                    },
                },
            )
            header = self._response_header(response)
            avatar = self._response_avatar(response)
            stream_url = str(avatar.get("stream_url") or header.get("stream_url") or "")
            if not stream_url.startswith(("rtmp://", "rtmps://")):
                raise RuntimeError("Iflytek avatar start response is missing an RTMP stream URL")
            latency_ms = int((time.perf_counter() - started) * 1000)
            self.client.log_call(model_name="iflytek-avatar-start", success=True, latency_ms=latency_ms)
            logger.info(
                "iflytek_avatar_response host=%s path=%s ctrl=start code=0 avatarId=%s sid=%s latencyMs=%s",
                endpoint.netloc,
                endpoint.path,
                selected_avatar_id,
                mask_provider_sid(state.sid),
                latency_ms,
            )
            return IflytekVirtualHumanSession(
                provider_session=handle,
                stream_url=stream_url,
                sid=state.sid or None,
            )
        except Exception as exc:
            message = sanitize_provider_error(str(exc) or exc.__class__.__name__)
            latency_ms = int((time.perf_counter() - started) * 1000)
            self.client.log_call(
                model_name="iflytek-avatar-start",
                success=False,
                latency_ms=latency_ms,
                error_message=message,
            )
            if state is not None:
                await self._close_state(state)
            raise RuntimeError(message) from exc

    async def drive_text(
        self,
        *,
        provider_session: str,
        user_id: str,
        text: str,
        voice_id: str | None = None,
    ) -> IflytekVirtualHumanCommandResult:
        del user_id
        content = text.strip()
        if not content:
            raise RuntimeError("Iflytek avatar driver text is empty")
        if len(content) > self.MAX_DRIVER_TEXT_CHARACTERS:
            raise RuntimeError(
                f"Iflytek avatar driver text exceeds {self.MAX_DRIVER_TEXT_CHARACTERS} characters"
            )
        state = self._require_connection(provider_session)
        selected_voice_id = (voice_id or settings.iflytek_digital_human_voice_id).strip()
        request_id = uuid4().hex
        started = time.perf_counter()
        try:
            await self._send_and_wait(
                state,
                request_id=request_id,
                ctrl="text_driver",
                payload={
                    "header": {
                        "app_id": settings.iflytek_app_id,
                        "ctrl": "text_driver",
                        "request_id": request_id,
                    },
                    "parameter": {
                        "avatar_dispatch": {"interactive_mode": 0},
                        "tts": self._tts_parameters(selected_voice_id),
                        "air": {"air": 0, "add_nonsemantic": 0},
                    },
                    "payload": {"text": {"content": content}},
                },
            )
            latency_ms = int((time.perf_counter() - started) * 1000)
            self.client.log_call(model_name="iflytek-avatar-text-driver", success=True, latency_ms=latency_ms)
            logger.info(
                "iflytek_avatar_response host=%s path=%s ctrl=text_driver code=0 sid=%s latencyMs=%s",
                urlparse(settings.iflytek_digital_human_url).netloc,
                urlparse(settings.iflytek_digital_human_url).path,
                mask_provider_sid(state.sid),
                latency_ms,
            )
            return IflytekVirtualHumanCommandResult(
                provider_session=provider_session,
                sid=state.sid or None,
            )
        except Exception as exc:
            message = sanitize_provider_error(str(exc) or exc.__class__.__name__)
            self.client.log_call(
                model_name="iflytek-avatar-text-driver",
                success=False,
                latency_ms=int((time.perf_counter() - started) * 1000),
                error_message=message,
            )
            raise RuntimeError(message) from exc

    async def ping(self, *, provider_session: str, user_id: str) -> IflytekVirtualHumanCommandResult:
        del user_id
        state = self._require_connection(provider_session)
        request_id = uuid4().hex
        async with state.command_lock:
            await self._send_json(
                state,
                {
                    "header": {
                        "app_id": settings.iflytek_app_id,
                        "ctrl": "ping",
                        "request_id": request_id,
                    }
                },
            )
        logger.info(
            "iflytek_avatar_request host=%s path=%s ctrl=ping sid=%s",
            urlparse(settings.iflytek_digital_human_url).netloc,
            urlparse(settings.iflytek_digital_human_url).path,
            mask_provider_sid(state.sid),
        )
        return IflytekVirtualHumanCommandResult(
            provider_session=provider_session,
            sid=state.sid or None,
        )

    async def stop(self, *, provider_session: str, user_id: str) -> IflytekVirtualHumanCommandResult:
        del user_id
        state = self._connections.get(provider_session)
        if state is None:
            return IflytekVirtualHumanCommandResult(provider_session=provider_session)
        if state.closed_event.is_set():
            sid = state.sid or None
            await self._close_state(state)
            return IflytekVirtualHumanCommandResult(provider_session=provider_session, sid=sid)

        request_id = uuid4().hex
        state.stop_requested = True
        stop_error: Exception | None = None
        try:
            await self._send_and_wait(
                state,
                request_id=request_id,
                ctrl="stop",
                payload={
                    "header": {
                        "app_id": settings.iflytek_app_id,
                        "ctrl": "stop",
                        "request_id": request_id,
                    }
                },
                timeout=self.STOP_ACK_TIMEOUT_SECONDS,
            )
            logger.info(
                "iflytek_avatar_response host=%s path=%s ctrl=stop code=0 sid=%s",
                urlparse(settings.iflytek_digital_human_url).netloc,
                urlparse(settings.iflytek_digital_human_url).path,
                mask_provider_sid(state.sid),
            )
        except TimeoutError:
            logger.warning(
                "iflytek_avatar_stop_unconfirmed host=%s path=%s sid=%s",
                urlparse(settings.iflytek_digital_human_url).netloc,
                urlparse(settings.iflytek_digital_human_url).path,
                mask_provider_sid(state.sid),
            )
        except Exception as exc:
            if not (state.closed_event.is_set() and not state.close_error):
                stop_error = exc
        finally:
            sid = state.sid or None
            await self._close_state(state)
        if stop_error is not None:
            raise RuntimeError(sanitize_provider_error(str(stop_error))) from stop_error
        return IflytekVirtualHumanCommandResult(provider_session=provider_session, sid=sid)

    async def wait_closed(self, provider_session: str) -> None:
        state = self._connections.get(provider_session)
        if state is None:
            return
        await state.closed_event.wait()
        if state.close_error and not state.stop_requested:
            raise RuntimeError(state.close_error)

    async def shutdown(self) -> None:
        for handle in list(self._connections):
            with contextlib.suppress(Exception):
                await self.stop(provider_session=handle, user_id="shutdown")

    def _validate_configuration(self) -> None:
        required = {
            "IFLYTEK_APP_ID": settings.iflytek_app_id,
            "IFLYTEK_API_KEY": settings.iflytek_api_key,
            "IFLYTEK_API_SECRET": settings.iflytek_api_secret,
            "IFLYTEK_DIGITAL_HUMAN_URL": settings.iflytek_digital_human_url,
            "IFLYTEK_DIGITAL_HUMAN_SERVICE_ID": settings.iflytek_digital_human_service_id,
        }
        missing = [name for name, value in required.items() if not value.strip()]
        if missing:
            raise RuntimeError(f"Iflytek avatar configuration is missing: {', '.join(missing)}")
        endpoint = urlparse(settings.iflytek_digital_human_url)
        if endpoint.scheme not in {"ws", "wss"} or not endpoint.netloc or endpoint.path != "/v1/interact":
            raise RuntimeError(
                "IFLYTEK_DIGITAL_HUMAN_URL must be an absolute WebSocket URL ending in /v1/interact"
            )

    async def _open_websocket(self, signed_url: str) -> tuple[Any, Any | None]:
        connection = self.websocket_factory(
            signed_url,
            open_timeout=settings.iflytek_request_timeout_seconds,
            close_timeout=5,
            max_size=4 * 1024 * 1024,
            ping_interval=None,
        )
        if inspect.isawaitable(connection):
            return await connection, None
        if hasattr(connection, "__aenter__"):
            return await connection.__aenter__(), connection
        return connection, None

    async def _send_and_wait(
        self,
        state: _AvatarConnection,
        *,
        request_id: str,
        ctrl: str,
        payload: dict[str, Any],
        timeout: float | None = None,
    ) -> dict[str, Any]:
        async with state.command_lock:
            if state.closed_event.is_set():
                raise RuntimeError(state.close_error or "Iflytek avatar WebSocket is closed")
            future: asyncio.Future[dict[str, Any]] = asyncio.get_running_loop().create_future()
            state.pending[request_id] = _PendingAvatarCommand(
                request_id=request_id,
                ctrl=ctrl,
                future=future,
            )
            try:
                await self._send_json(state, payload)
                return await asyncio.wait_for(
                    future,
                    timeout=timeout or settings.iflytek_request_timeout_seconds,
                )
            finally:
                state.pending.pop(request_id, None)

    async def _send_json(self, state: _AvatarConnection, payload: dict[str, Any]) -> None:
        if state.closed_event.is_set():
            raise RuntimeError(state.close_error or "Iflytek avatar WebSocket is closed")
        await state.websocket.send(json.dumps(payload, ensure_ascii=False))

    async def _reader_loop(self, state: _AvatarConnection) -> None:
        try:
            while True:
                raw = await state.websocket.recv()
                data = json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else raw)
                self._route_response(state, data)
        except asyncio.CancelledError:
            return
        except Exception as exc:
            message = sanitize_provider_error(str(exc) or exc.__class__.__name__)
            if not state.closing and not state.stop_requested:
                state.close_error = message
                logger.warning(
                    "iflytek_avatar_connection_closed sid=%s error=%s",
                    mask_provider_sid(state.sid),
                    message,
                )
            self._fail_pending(state, RuntimeError(message))
        finally:
            state.closed_event.set()

    def _route_response(self, state: _AvatarConnection, data: Any) -> None:
        if not isinstance(data, dict):
            raise RuntimeError("Iflytek avatar returned an invalid response body")
        header = self._response_header(data)
        if "code" not in header:
            raise RuntimeError("Iflytek avatar response is missing header.code")
        try:
            code = int(header["code"])
        except (TypeError, ValueError) as exc:
            raise RuntimeError("Iflytek avatar returned an invalid header.code") from exc
        state.sid = str(header.get("sid") or state.sid)
        state.server_session = str(header.get("session") or state.server_session)
        avatar = self._response_avatar(data)
        request_id = str(avatar.get("request_id") or header.get("request_id") or "")
        if code != 0:
            self._raise_business_error(state, code, str(header.get("message") or "unknown"))
        if "error_code" in avatar:
            try:
                avatar_error = int(avatar.get("error_code") or 0)
            except (TypeError, ValueError) as exc:
                raise RuntimeError("Iflytek avatar returned an invalid payload.avatar.error_code") from exc
            if avatar_error != 0:
                self._raise_business_error(
                    state,
                    avatar_error,
                    str(avatar.get("error_message") or "unknown"),
                )

        event_type = str(avatar.get("event_type") or "")
        if event_type == "driver_status" and avatar.get("vmr_status") is not None:
            logger.info(
                "iflytek_avatar_driver_status status=%s sid=%s",
                avatar.get("vmr_status"),
                mask_provider_sid(state.sid),
            )

        candidates: list[_PendingAvatarCommand]
        if request_id and request_id in state.pending:
            candidates = [state.pending[request_id]]
        else:
            candidates = list(state.pending.values())
        for pending in candidates:
            if pending.future.done():
                continue
            if pending.ctrl == "start":
                stream_url = str(avatar.get("stream_url") or header.get("stream_url") or "")
                if event_type == "stream_info" and stream_url:
                    pending.future.set_result(data)
                    return
            elif pending.ctrl == "text_driver":
                if event_type == "driver_status" and avatar.get("vmr_status") is not None:
                    pending.future.set_result(data)
                    return
            elif pending.ctrl == "stop":
                if request_id == pending.request_id or (not avatar and code == 0):
                    pending.future.set_result(data)
                    return

    def _raise_business_error(self, state: _AvatarConnection, code: int, message: str) -> None:
        sid = mask_provider_sid(state.sid)
        suffix = f" (sid={sid})" if sid else ""
        error = RuntimeError(f"Iflytek avatar error {code}: {message}{suffix}")
        state.close_error = sanitize_provider_error(str(error))
        self._fail_pending(state, error)
        raise error

    async def _close_state(self, state: _AvatarConnection) -> None:
        self._connections.pop(state.handle, None)
        state.closing = True
        current_task = asyncio.current_task()
        with contextlib.suppress(Exception):
            await state.websocket.close()
        if state.context_manager is not None:
            with contextlib.suppress(Exception):
                await state.context_manager.__aexit__(None, None, None)
        if state.reader_task is not None and state.reader_task is not current_task:
            if not state.reader_task.done():
                state.reader_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await state.reader_task
        self._fail_pending(state, RuntimeError("Iflytek avatar WebSocket closed"))
        state.closed_event.set()

    def _require_connection(self, handle: str) -> _AvatarConnection:
        state = self._connections.get(handle)
        if state is None or state.closed_event.is_set():
            error = state.close_error if state is not None else None
            raise RuntimeError(error or "Iflytek avatar session is not running")
        return state

    @staticmethod
    def _tts_parameters(voice_id: str) -> dict[str, Any]:
        return {"vcn": voice_id, "speed": 50, "pitch": 50, "volume": 50}

    @staticmethod
    def _response_header(data: dict[str, Any]) -> dict[str, Any]:
        header = data.get("header")
        return header if isinstance(header, dict) else {}

    @staticmethod
    def _response_avatar(data: dict[str, Any]) -> dict[str, Any]:
        payload = data.get("payload")
        if not isinstance(payload, dict):
            return {}
        avatar = payload.get("avatar")
        return avatar if isinstance(avatar, dict) else {}

    @staticmethod
    def _fail_pending(state: _AvatarConnection, error: Exception) -> None:
        for pending in list(state.pending.values()):
            if not pending.future.done():
                pending.future.set_exception(error)

    async def create_explanation(self, payload: IflytekDigitalHumanRequest) -> IflytekProviderResult:
        if self.client.mock_enabled:
            self.client.log_call(model_name="iflytek-digital-human-mock", success=True, latency_ms=0)
            mock_url = f"{settings.file_storage_public_base_url.rstrip('/')}/mock/digital-human-explain.mp4"
            return IflytekProviderResult(
                provider_task_id=f"iflytek_digital_human_mock_{uuid4().hex[:12]}",
                status=TaskStatus.success,
                text=payload.script,
                video_url=mock_url,
                file_url=mock_url,
                raw_payload={"mock": True, "avatarId": payload.avatar_id, "voiceId": payload.voice_id},
            )
        raise RuntimeError("AI virtual human is a real-time stream; use the digital-human chat live session API")
