from uuid import uuid4

from app.core.config import settings
from app.schemas.common import TaskStatus
from app.services.providers.iflytek.client import IflytekClient
from app.services.providers.iflytek.types import IflytekDigitalHumanRequest, IflytekProviderResult


class IflytekDigitalHumanProvider:
    def __init__(self, client: IflytekClient | None = None) -> None:
        self.client = client or IflytekClient(base_url=settings.iflytek_digital_human_base_url)

    async def create_explanation(self, payload: IflytekDigitalHumanRequest) -> IflytekProviderResult:
        if self.client.mock_enabled:
            self.client.log_call(model_name="iflytek-digital-human-mock", success=True, latency_ms=0)
            provider_task_id = f"iflytek_dh_mock_{uuid4().hex[:8]}"
            mock_url = f"{settings.file_storage_public_base_url.rstrip('/')}/mock/digital-human-explain.mp4"
            return IflytekProviderResult(
                provider_task_id=provider_task_id,
                status=TaskStatus.success,
                text=payload.script,
                video_url=mock_url,
                file_url=mock_url,
                raw_payload={"mock": True, "avatarId": payload.avatar_id, "voiceId": payload.voice_id},
            )

        base_url = settings.iflytek_digital_human_base_url or settings.iflytek_base_url
        response = await self.client.post_json(
            "/digital-human/tasks",
            payload.model_dump(by_alias=True, mode="json"),
            model_name="iflytek-digital-human",
            base_url=base_url,
        )
        status_value = str(response.get("status") or "running")
        status = TaskStatus.success if status_value in {"success", "done", "completed"} else TaskStatus.running
        video_url = str(response.get("videoUrl") or response.get("fileUrl") or response.get("url") or "")
        return IflytekProviderResult(
            provider_task_id=str(response.get("taskId") or response.get("id") or ""),
            status=status,
            text=payload.script,
            video_url=video_url or None,
            file_url=video_url or None,
            raw_payload=response,
        )
