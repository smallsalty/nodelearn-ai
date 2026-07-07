from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class ProviderCallLogEntry:
    id: str
    provider: str
    model_name: str
    success: bool
    latency_ms: int
    error_message: str | None = None


PROVIDER_CALL_LOGS: list[ProviderCallLogEntry] = []


class IflytekClient:
    def __init__(self, base_url: str | None = None, client: httpx.AsyncClient | None = None) -> None:
        self.base_url = (base_url or settings.iflytek_base_url or "").rstrip("/")
        self._client = client

    @property
    def mock_enabled(self) -> bool:
        return (
            settings.enable_mock
            or settings.iflytek_enable_mock
            or not settings.iflytek_api_key
            or not settings.iflytek_api_secret
            or not settings.iflytek_app_id
        )

    async def post_json(
        self,
        path: str,
        payload: dict[str, Any],
        *,
        model_name: str,
        base_url: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        url_base = (base_url or self.base_url).rstrip("/")
        if not url_base:
            raise RuntimeError("IFLYTEK_BASE_URL is not configured")
        merged_headers = {
            "X-App-Id": settings.iflytek_app_id,
            "X-Api-Key": settings.iflytek_api_key,
            "Content-Type": "application/json",
            **(headers or {}),
        }
        started = time.perf_counter()
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                response = await self._post(url_base, path, payload, merged_headers)
                latency_ms = int((time.perf_counter() - started) * 1000)
                self.log_call(model_name=model_name, success=True, latency_ms=latency_ms)
                return response
            except Exception as exc:
                last_error = exc
                if attempt == 1:
                    break
        latency_ms = int((time.perf_counter() - started) * 1000)
        message = str(last_error) if last_error else "unknown iflytek error"
        self.log_call(model_name=model_name, success=False, latency_ms=latency_ms, error_message=message)
        raise RuntimeError(message)

    async def _post(self, base_url: str, path: str, payload: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
        if self._client is not None:
            return await self._post_with_client(self._client, base_url, path, payload, headers)
        async with httpx.AsyncClient(timeout=httpx.Timeout(settings.iflytek_request_timeout_seconds)) as client:
            return await self._post_with_client(client, base_url, path, payload, headers)

    async def _post_with_client(
        self,
        client: httpx.AsyncClient,
        base_url: str,
        path: str,
        payload: dict[str, Any],
        headers: dict[str, str],
    ) -> dict[str, Any]:
        response = await client.post(f"{base_url}/{path.lstrip('/')}", json=payload, headers=headers)
        if not response.is_success:
            raise RuntimeError(f"Iflytek request failed with HTTP {response.status_code}")
        parsed = response.json()
        if not isinstance(parsed, dict):
            raise RuntimeError("Iflytek returned an invalid response body")
        return parsed

    def log_call(self, *, model_name: str, success: bool, latency_ms: int, error_message: str | None = None) -> None:
        entry = ProviderCallLogEntry(
            id=f"provider_call_{uuid4().hex[:12]}",
            provider="iflytek",
            model_name=model_name,
            success=success,
            latency_ms=latency_ms,
            error_message=error_message,
        )
        PROVIDER_CALL_LOGS.append(entry)
        log_level = logging.INFO if success else logging.WARNING
        logger.log(
            log_level,
            "iflytek_provider_call provider=iflytek model=%s success=%s latencyMs=%s error=%s",
            model_name,
            success,
            latency_ms,
            error_message,
        )
