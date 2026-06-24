from uuid import uuid4

from app.core.config import settings
from app.schemas.common import TaskStatus
from app.services.providers.iflytek.client import IflytekClient
from app.services.providers.iflytek.types import IflytekProviderResult


class IflytekTtsProvider:
    def __init__(self, client: IflytekClient | None = None) -> None:
        self.client = client or IflytekClient()

    async def synthesize(self, text: str, *, user_id: str, voice_id: str | None = None) -> IflytekProviderResult:
        if self.client.mock_enabled:
            self.client.log_call(model_name=settings.iflytek_tts_voice or "iflytek-tts-mock", success=True, latency_ms=0)
            return IflytekProviderResult(
                provider_task_id=f"iflytek_tts_mock_{uuid4().hex[:8]}",
                status=TaskStatus.success,
                text=text,
                audio_url=f"{settings.file_storage_public_base_url.rstrip('/')}/mock/iflytek-tts.mp3",
                raw_payload={"mock": True, "voiceId": voice_id or settings.iflytek_tts_voice},
            )

        response = await self.client.post_json(
            "/tts/synthesize",
            {"userId": user_id, "text": text, "voiceId": voice_id or settings.iflytek_tts_voice},
            model_name=settings.iflytek_tts_voice or "iflytek-tts",
        )
        audio_url = str(response.get("audioUrl") or response.get("audio_url") or "")
        if not audio_url:
            raise RuntimeError("Iflytek TTS response is missing audioUrl")
        return IflytekProviderResult(
            provider_task_id=str(response.get("taskId") or response.get("id") or ""),
            status=TaskStatus.success,
            text=text,
            audio_url=audio_url,
            raw_payload=response,
        )
