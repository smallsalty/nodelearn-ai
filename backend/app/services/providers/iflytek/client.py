from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import re
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from email.utils import format_datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
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


def mask_provider_sid(sid: str) -> str:
    value = sid.strip()
    if not value:
        return ""
    if len(value) <= 10:
        return f"{value[:3]}***"
    return f"{value[:6]}***{value[-4:]}"


def mask_provider_credential(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return "<unset>"
    if len(normalized) <= 8:
        return f"{normalized[:2]}***"
    return f"{normalized[:4]}***{normalized[-4:]}"


def sanitize_provider_error(message: str) -> str:
    sanitized = re.sub(r"(?i)(authorization|api_key|api_secret|token)=([^&\s]+)", r"\1=***", message)
    sanitized = re.sub(r"(?i)rtmps?://[^\s|]+", "rtmp://***", sanitized)
    sanitized = re.sub(
        r"(?i)(sid=)([^)&,\s]+)",
        lambda match: f"{match.group(1)}{mask_provider_sid(match.group(2))}",
        sanitized,
    )
    for secret in (settings.iflytek_api_key, settings.iflytek_api_secret):
        if secret:
            sanitized = sanitized.replace(secret, "***")
    return sanitized[:800]


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

    def build_signed_url(
        self,
        method: str,
        url: str,
        *,
        now: datetime | None = None,
    ) -> str:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise RuntimeError("Iflytek signed URL must be absolute")
        path = parsed.path or "/"
        date_value = format_datetime((now or datetime.now(UTC)).astimezone(UTC), usegmt=True)
        signature_origin = f"host: {parsed.netloc}\ndate: {date_value}\n{method.upper()} {path} HTTP/1.1"
        digest = hmac.new(
            settings.iflytek_api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        signature = base64.b64encode(digest).decode("ascii")
        authorization_origin = (
            f'api_key="{settings.iflytek_api_key}", algorithm="hmac-sha256", '
            f'headers="host date request-line", signature="{signature}"'
        )
        authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("ascii")
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query.update({"authorization": authorization, "date": date_value, "host": parsed.netloc})
        return urlunparse(parsed._replace(query=urlencode(query)))

    async def post_json(
        self,
        path: str,
        payload: dict[str, Any],
        *,
        model_name: str,
        base_url: str | None = None,
        headers: dict[str, str] | None = None,
        retry_count: int = 0,
        require_business_header: bool = False,
    ) -> dict[str, Any]:
        url_base = (base_url or self.base_url).rstrip("/")
        if not url_base:
            raise RuntimeError("IFLYTEK_BASE_URL is not configured")
        merged_headers = {"Content-Type": "application/json", **(headers or {})}
        started = time.perf_counter()
        last_error: Exception | None = None
        for attempt in range(retry_count + 1):
            try:
                url = self.build_signed_url("POST", f"{url_base}/{path.lstrip('/')}")
                response = await self._post(url, payload, merged_headers)
                self._validate_business_response(response, require_header=require_business_header)
                latency_ms = int((time.perf_counter() - started) * 1000)
                self.log_call(model_name=model_name, success=True, latency_ms=latency_ms)
                return response
            except Exception as exc:
                last_error = exc
                if attempt >= retry_count:
                    break
        latency_ms = int((time.perf_counter() - started) * 1000)
        message = sanitize_provider_error(str(last_error)) if last_error else "unknown iflytek error"
        self.log_call(model_name=model_name, success=False, latency_ms=latency_ms, error_message=message)
        raise RuntimeError(message)

    async def _post(self, url: str, payload: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
        if self._client is not None:
            return await self._post_with_client(self._client, url, payload, headers)
        timeout = httpx.Timeout(settings.iflytek_request_timeout_seconds)
        async with httpx.AsyncClient(timeout=timeout) as client:
            return await self._post_with_client(client, url, payload, headers)

    async def _post_with_client(
        self,
        client: httpx.AsyncClient,
        url: str,
        payload: dict[str, Any],
        headers: dict[str, str],
    ) -> dict[str, Any]:
        response = await client.post(url, json=payload, headers=headers)
        if not response.is_success:
            provider_message = self._response_message(response)
            suffix = f": {provider_message}" if provider_message else ""
            raise RuntimeError(f"Iflytek request failed with HTTP {response.status_code}{suffix}")
        parsed = response.json()
        if not isinstance(parsed, dict):
            raise RuntimeError("Iflytek returned an invalid response body")
        return parsed

    @staticmethod
    def _response_message(response: httpx.Response) -> str:
        try:
            body = response.json()
        except Exception:
            return ""
        if not isinstance(body, dict):
            return ""
        header = body.get("header") if isinstance(body.get("header"), dict) else {}
        return str(header.get("message") or body.get("message") or "")[:300]

    @staticmethod
    def _validate_business_response(response: dict[str, Any], *, require_header: bool = False) -> None:
        header = response.get("header")
        if not isinstance(header, dict) or "code" not in header:
            if require_header:
                raise RuntimeError("Iflytek response is missing header.code")
            return
        try:
            code = int(header.get("code", 0))
        except (TypeError, ValueError):
            code = -1
        if code != 0:
            sid = mask_provider_sid(str(header.get("sid") or ""))
            message = str(header.get("message") or "unknown provider error")
            sid_suffix = f" (sid={sid})" if sid else ""
            raise RuntimeError(f"Iflytek business error {code}: {message}{sid_suffix}")

    def log_call(self, *, model_name: str, success: bool, latency_ms: int, error_message: str | None = None) -> None:
        sanitized_error = sanitize_provider_error(error_message) if error_message else None
        entry = ProviderCallLogEntry(
            id=f"provider_call_{uuid4().hex[:12]}",
            provider="iflytek",
            model_name=model_name,
            success=success,
            latency_ms=latency_ms,
            error_message=sanitized_error,
        )
        PROVIDER_CALL_LOGS.append(entry)
        log_level = logging.INFO if success else logging.WARNING
        logger.log(
            log_level,
            "iflytek_provider_call provider=iflytek model=%s success=%s latencyMs=%s error=%s",
            model_name,
            success,
            latency_ms,
            sanitized_error,
        )
