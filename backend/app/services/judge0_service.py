from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class JudgeExecution:
    status: str
    stdout: str | None = None
    stderr: str | None = None
    compile_output: str | None = None
    time_seconds: float | None = None
    memory_kb: float | None = None


class Judge0Service:
    """Judge0-compatible remote execution boundary; never runs user code locally."""

    def _language_id(self, language: str) -> int:
        return {"cpp": settings.judge0_cpp_language_id, "c": settings.judge0_c_language_id, "python": settings.judge0_python_language_id}[language]

    async def execute(self, language: str, source_code: str, stdin: str) -> JudgeExecution:
        if not settings.judge0_base_url:
            return JudgeExecution(status="system_error", stderr="Judge0 服务未配置")
        headers = {"X-Auth-Token": settings.judge0_auth_token} if settings.judge0_auth_token else {}
        payload = {
            "language_id": self._language_id(language),
            "source_code": self._encode(source_code),
            "stdin": self._encode(stdin),
            "cpu_time_limit": settings.programming_time_limit_seconds,
        }
        try:
            async with httpx.AsyncClient(base_url=settings.judge0_base_url.rstrip("/"), timeout=settings.judge0_timeout_seconds) as client:
                created = await client.post("/submissions?base64_encoded=true&wait=false", json=payload, headers=headers)
                created.raise_for_status()
                token = created.json().get("token")
                if not isinstance(token, str):
                    return JudgeExecution(status="system_error", stderr="Judge0 未返回 submission token")
                for _ in range(20):
                    await asyncio.sleep(0.4)
                    response = await client.get(f"/submissions/{token}?base64_encoded=true", headers=headers)
                    response.raise_for_status()
                    body = response.json()
                    status_id = int((body.get("status") or {}).get("id", 0))
                    if status_id in {1, 2}:
                        continue
                    return self._parse(body)
                return JudgeExecution(status="TLE", stderr="Judge0 判题轮询超时")
        except httpx.HTTPError as exc:
            return JudgeExecution(status="system_error", stderr=f"Judge0 请求失败：{exc}")

    def _parse(self, body: dict) -> JudgeExecution:
        status_id = int((body.get("status") or {}).get("id", 0))
        status = {3: "ok", 4: "WA", 5: "TLE", 6: "CE", 7: "RE", 8: "RE", 9: "RE", 10: "RE", 11: "RE", 12: "RE", 13: "RE"}.get(status_id, "system_error")
        return JudgeExecution(
            status=status,
            stdout=self._decode(body.get("stdout")), stderr=self._decode(body.get("stderr")),
            compile_output=self._decode(body.get("compile_output")),
            time_seconds=float(body["time"]) if body.get("time") is not None else None,
            memory_kb=float(body["memory"]) if body.get("memory") is not None else None,
        )

    @staticmethod
    def _encode(value: str) -> str: return base64.b64encode(value.encode()).decode()
    @staticmethod
    def _decode(value: str | None) -> str | None:
        return base64.b64decode(value).decode(errors="replace") if value else None
