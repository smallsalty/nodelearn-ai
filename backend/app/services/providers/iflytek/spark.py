import time
from uuid import uuid4

from app.core.config import settings
from app.schemas.common import TaskStatus
from app.services.providers.iflytek.client import IflytekClient
from app.services.providers.iflytek.types import IflytekChatRequest, IflytekProviderResult


class IflytekSparkProvider:
    def __init__(self, client: IflytekClient | None = None) -> None:
        self.client = client or IflytekClient()

    async def chat(self, payload: IflytekChatRequest) -> IflytekProviderResult:
        if self.client.mock_enabled:
            started = time.perf_counter()
            answer = self._mock_answer(payload)
            self.client.log_call(
                model_name=settings.iflytek_spark_model or "iflytek-spark-mock",
                success=True,
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
            return IflytekProviderResult(
                provider_task_id=f"iflytek_spark_mock_{uuid4().hex[:8]}",
                status=TaskStatus.success,
                text=answer,
                raw_payload={"mock": True},
            )

        response = await self.client.post_json(
            "/spark/chat",
            payload.model_dump(by_alias=True, mode="json"),
            model_name=settings.iflytek_spark_model or "iflytek-spark",
        )
        text = str(response.get("answer") or response.get("text") or response.get("content") or "")
        if not text:
            raise RuntimeError("Iflytek Spark response is missing answer text")
        return IflytekProviderResult(
            provider_task_id=str(response.get("taskId") or response.get("id") or ""),
            status=TaskStatus.success,
            text=text,
            raw_payload=response,
        )

    def _mock_answer(self, payload: IflytekChatRequest) -> str:
        node_label = payload.node_id or "当前知识点"
        source_hint = ""
        if payload.documents:
            source_hint = f"我参考了 {len(payload.documents)} 条课程材料，"
        profile_hint = f"结合你的画像：{payload.profile_summary}。" if payload.profile_summary else ""
        return (
            f"{source_hint}围绕{node_label}回答：{payload.message}。"
            "先抓住定义，再看具体操作步骤，最后用一个小例子检查是否真正理解。"
            f"{profile_hint}"
        )
