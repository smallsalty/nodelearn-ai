import asyncio
import json
from urllib.parse import urlparse

from app.core.config import settings
from app.services.providers.iflytek.client import mask_provider_credential, sanitize_provider_error
from app.services.providers.iflytek.interface_service_chat import IflytekInterfaceServiceChatProvider
from app.services.providers.iflytek.types import IflytekChatRequest


USER_ID = "iflytek_chat_smoke_001"
SESSION_ID = "iflytek_chat_smoke_session_001"
QUESTION = "请用两句话解释数据结构中栈的后进先出特性。"


async def main() -> None:
    provider = IflytekInterfaceServiceChatProvider()
    provider._validate_configuration()
    endpoint = urlparse(settings.iflytek_digital_human_chat_url)
    request = IflytekChatRequest(
        user_id=USER_ID,
        session_id=SESSION_ID,
        course_id="course_ds_001",
        node_id="node_stack_001",
        message=QUESTION,
        profile_summary="偏好简洁示例",
        documents=[],
    )
    wire_request = provider._build_request(request)
    safe_protocol = {
        "requestDomain": endpoint.netloc,
        "apiPath": endpoint.path or "/",
        "webSocketUrl": f"{endpoint.scheme}://{endpoint.netloc}{endpoint.path or '/'}",
        "authentication": {
            "type": "URL HMAC-SHA256",
            "queryParameters": ["host", "date", "authorization"],
            "requestLine": f"GET {endpoint.path or '/'} HTTP/1.1",
            "apiKey": mask_provider_credential(settings.iflytek_api_key),
            "apiSecret": "<configured; never printed>",
        },
        "requestParameters": {
            "header": {
                "app_id": mask_provider_credential(settings.iflytek_app_id),
                "uid": wire_request["header"]["uid"],
                "request_id": "<generated per request>",
                "ctrl": wire_request["header"]["ctrl"],
                "session": "<reused provider session or empty>",
                "scene_id": wire_request["header"]["scene_id"],
                "scene_version": wire_request["header"]["scene_version"],
            },
            "parameter": wire_request["parameter"],
            "payload": {
                "text": {
                    "contentCharacters": len(wire_request["payload"]["text"]["content"]),
                },
            },
        },
        "expectedResponseStructure": {
            "header": ["code", "message", "sid", "session"],
            "payload.nlp": [
                "error_code",
                "error_message",
                "request_id",
                "status",
                "service",
                "answer.text",
            ],
        },
    }
    print(json.dumps(safe_protocol, ensure_ascii=False, indent=2))
    result = await provider.chat(request)
    print(
        json.dumps(
            {
                "status": str(result.status),
                "providerTaskId": result.provider_task_id,
                "answer": result.text,
                "responseMetadata": (result.raw_payload or {}).get("responseMetadata", {}),
                "virtualHumanStarted": False,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        raise SystemExit(sanitize_provider_error(str(exc) or exc.__class__.__name__)) from None
