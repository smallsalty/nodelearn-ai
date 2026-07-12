from __future__ import annotations

import asyncio
import json
import logging
import time
from collections.abc import Callable
from typing import Any
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
from app.services.providers.iflytek.types import IflytekChatRequest, IflytekProviderResult

logger = logging.getLogger(__name__)


class IflytekInterfaceServiceChatProvider:
    """Large-model conversation capability published with the virtual-human interface service."""

    PROMPT_CHARACTER_BUDGET = 7500
    PROFILE_CHARACTER_BUDGET = 800
    DOCUMENT_CHARACTER_BUDGET = 1800

    def __init__(
        self,
        client: IflytekClient | None = None,
        websocket_factory: Callable[..., Any] | None = None,
    ) -> None:
        self.client = client or IflytekClient()
        self.websocket_factory = websocket_factory or websockets.connect
        self._provider_sessions: dict[str, str] = {}
        self._session_locks: dict[str, asyncio.Lock] = {}

    async def chat(self, payload: IflytekChatRequest) -> IflytekProviderResult:
        self._validate_configuration()
        started = time.perf_counter()
        endpoint = urlparse(settings.iflytek_digital_human_chat_url)
        model_name = f"iflytek-interface-service:{settings.iflytek_digital_human_service_id}"
        logger.info(
            "iflytek_interface_chat_request host=%s path=%s appId=%s apiKey=%s serviceId=%s chatId=%s",
            endpoint.netloc,
            endpoint.path or "/",
            mask_provider_credential(settings.iflytek_app_id),
            mask_provider_credential(settings.iflytek_api_key),
            settings.iflytek_digital_human_service_id,
            payload.session_id,
        )
        try:
            async with self._lock_for(payload.session_id):
                signed_url = self.client.build_signed_url("GET", settings.iflytek_digital_human_chat_url)
                request_payload = self._build_request(
                    payload,
                    request_id=uuid4().hex,
                    provider_session=self._provider_sessions.get(payload.session_id, ""),
                )
                answer, sid, provider_session, response_metadata = await self._collect_response(
                    signed_url,
                    request_payload,
                )
                if provider_session:
                    self._provider_sessions[payload.session_id] = provider_session
            if not answer.strip():
                raise RuntimeError("Iflytek interface-service chat response is missing answer text")
            latency_ms = int((time.perf_counter() - started) * 1000)
            self.client.log_call(model_name=model_name, success=True, latency_ms=latency_ms)
            logger.info(
                "iflytek_interface_chat_response host=%s path=%s serviceId=%s code=0 sid=%s latencyMs=%s",
                endpoint.netloc,
                endpoint.path or "/",
                settings.iflytek_digital_human_service_id,
                mask_provider_sid(sid),
                latency_ms,
            )
            return IflytekProviderResult(
                provider_task_id=mask_provider_sid(sid) or None,
                status=TaskStatus.success,
                text=answer.strip(),
                raw_payload={
                    "sid": sid,
                    "providerSession": provider_session,
                    "responseMetadata": response_metadata,
                },
            )
        except Exception as exc:
            message = sanitize_provider_error(str(exc) or exc.__class__.__name__)
            latency_ms = int((time.perf_counter() - started) * 1000)
            self.client.log_call(
                model_name=model_name,
                success=False,
                latency_ms=latency_ms,
                error_message=message,
            )
            logger.warning(
                "iflytek_interface_chat_response host=%s path=%s serviceId=%s success=false latencyMs=%s error=%s",
                endpoint.netloc,
                endpoint.path or "/",
                settings.iflytek_digital_human_service_id,
                latency_ms,
                message,
            )
            raise RuntimeError(message) from exc

    @staticmethod
    def _validate_configuration() -> None:
        required = {
            "IFLYTEK_APP_ID": settings.iflytek_app_id,
            "IFLYTEK_API_KEY": settings.iflytek_api_key,
            "IFLYTEK_API_SECRET": settings.iflytek_api_secret,
            "IFLYTEK_DIGITAL_HUMAN_CHAT_URL": settings.iflytek_digital_human_chat_url,
            "IFLYTEK_DIGITAL_HUMAN_SERVICE_ID": settings.iflytek_digital_human_service_id,
        }
        missing = [name for name, value in required.items() if not value.strip()]
        if missing:
            raise RuntimeError(f"Iflytek interface-service chat configuration is missing: {', '.join(missing)}")
        parsed = urlparse(settings.iflytek_digital_human_chat_url)
        if parsed.scheme not in {"ws", "wss"} or not parsed.netloc:
            raise RuntimeError("IFLYTEK_DIGITAL_HUMAN_CHAT_URL must be an absolute WebSocket URL")

    def _lock_for(self, session_id: str) -> asyncio.Lock:
        return self._session_locks.setdefault(session_id, asyncio.Lock())

    def _build_request(
        self,
        payload: IflytekChatRequest,
        *,
        request_id: str | None = None,
        provider_session: str = "",
    ) -> dict[str, Any]:
        return {
            "header": {
                "app_id": settings.iflytek_app_id,
                "request_id": request_id or uuid4().hex,
                "ctrl": "text_interact",
                "session": provider_session,
                "uid": payload.user_id[:32],
                "scene_id": settings.iflytek_digital_human_service_id,
                "scene_version": "1",
            },
            "parameter": {
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
            },
            "payload": {"text": {"content": self._build_prompt(payload)}},
        }

    def _build_prompt(self, payload: IflytekChatRequest) -> str:
        question = payload.message.strip()
        if not question:
            raise RuntimeError("Iflytek interface-service chat question is empty")
        prefix = "你是 NodeLearn AI 的数据结构课程助教。请用准确、简洁、适合口播的中文回答。"
        suffix = "只基于给定课程材料和通用数据结构事实回答；不要编造来源；控制在300字以内。"
        required_parts = [prefix]
        if payload.node_id:
            required_parts.append(f"当前知识点：{payload.node_id}")
        required_parts.extend([f"学生问题：{question}", suffix])
        required_text = "\n\n".join(required_parts)
        if len(required_text) > self.PROMPT_CHARACTER_BUDGET:
            raise RuntimeError("Iflytek interface-service chat question exceeds the prompt length limit")

        optional_parts: list[str] = []
        remaining = self.PROMPT_CHARACTER_BUDGET - len(required_text) - 4
        if payload.profile_summary and remaining > 20:
            profile = payload.profile_summary.strip()[: min(self.PROFILE_CHARACTER_BUDGET, remaining - 8)]
            if profile:
                optional_parts.append(f"学生画像：{profile}")
                remaining -= len(optional_parts[-1]) + 2
        materials: list[str] = []
        for document in (payload.documents or [])[:3]:
            if remaining <= 30:
                break
            title = document.title.strip()[:120]
            allowance = min(self.DOCUMENT_CHARACTER_BUDGET, remaining - len(title) - 6)
            if allowance <= 0:
                break
            content = document.content.strip()[:allowance]
            if content:
                material = f"【{title}】{content}"
                materials.append(material)
                remaining -= len(material) + 1
        if materials:
            optional_parts.append("课程材料：\n" + "\n".join(materials))

        prompt = "\n\n".join([prefix, *optional_parts, *required_parts[1:]])
        if len(prompt) > self.PROMPT_CHARACTER_BUDGET:
            raise RuntimeError("Iflytek interface-service chat prompt exceeds the length limit")
        return prompt

    async def _collect_response(
        self,
        signed_url: str,
        payload: dict[str, Any],
    ) -> tuple[str, str, str, dict[str, Any]]:
        chunks: list[str] = []
        sid = ""
        provider_session = ""
        response_metadata: dict[str, Any] = {}
        request_id = str(payload.get("header", {}).get("request_id") or "")
        connection = self.websocket_factory(
            signed_url,
            open_timeout=settings.iflytek_request_timeout_seconds,
            close_timeout=5,
            max_size=4 * 1024 * 1024,
        )
        async with connection as websocket:
            await websocket.send(json.dumps(payload, ensure_ascii=False))
            while True:
                raw = await asyncio.wait_for(websocket.recv(), timeout=settings.iflytek_request_timeout_seconds)
                data = json.loads(raw.decode("utf-8") if isinstance(raw, bytes) else raw)
                header = data.get("header") if isinstance(data, dict) else None
                if not isinstance(header, dict) or "code" not in header:
                    raise RuntimeError("Iflytek interface-service chat response is missing header.code")
                try:
                    code = int(header["code"])
                except (TypeError, ValueError) as exc:
                    raise RuntimeError("Iflytek interface-service chat returned an invalid header.code") from exc
                sid = str(header.get("sid") or sid)
                provider_session = str(header.get("session") or provider_session)
                if code != 0:
                    masked_sid = mask_provider_sid(sid)
                    sid_suffix = f" (sid={masked_sid})" if masked_sid else ""
                    raise RuntimeError(
                        f"Iflytek interface-service chat error {code}: "
                        f"{header.get('message') or 'unknown'}{sid_suffix}"
                    )
                response_payload = data.get("payload") if isinstance(data.get("payload"), dict) else {}
                nlp = response_payload.get("nlp") if isinstance(response_payload.get("nlp"), dict) else None
                if nlp is None:
                    continue
                if "error_code" not in nlp:
                    raise RuntimeError("Iflytek interface-service chat response is missing payload.nlp.error_code")
                try:
                    nlp_error_code = int(nlp["error_code"])
                except (TypeError, ValueError) as exc:
                    raise RuntimeError("Iflytek interface-service chat returned an invalid payload.nlp.error_code") from exc
                if nlp_error_code != 0:
                    masked_sid = mask_provider_sid(sid)
                    sid_suffix = f" (sid={masked_sid})" if masked_sid else ""
                    raise RuntimeError(
                        f"Iflytek interface-service chat NLP error {nlp_error_code}: "
                        f"{nlp.get('error_message') or 'unknown'}{sid_suffix}"
                    )
                response_request_id = str(nlp.get("request_id") or "")
                if response_request_id and request_id and response_request_id != request_id:
                    continue
                answer = nlp.get("answer") if isinstance(nlp.get("answer"), dict) else {}
                if answer.get("text"):
                    chunks.append(str(answer["text"]))
                response_metadata = {
                    key: value
                    for key, value in nlp.items()
                    if key not in {"answer", "content", "text"}
                }
                try:
                    status = int(nlp.get("status", 0))
                except (TypeError, ValueError) as exc:
                    raise RuntimeError("Iflytek interface-service chat returned an invalid payload.nlp.status") from exc
                if status == 2:
                    break
        return "".join(chunks), sid, provider_session, response_metadata
