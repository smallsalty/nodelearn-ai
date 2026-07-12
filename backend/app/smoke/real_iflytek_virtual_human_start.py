import asyncio
import json
from urllib.parse import urlparse

from app.core.config import settings
from app.services.providers.iflytek.client import mask_provider_credential, mask_provider_sid, sanitize_provider_error
from app.services.providers.iflytek.digital_human import IflytekDigitalHumanProvider


USER_ID = "iflytek_virtual_human_start_smoke_001"


async def main() -> None:
    provider = IflytekDigitalHumanProvider()
    if provider.client.mock_enabled:
        raise RuntimeError("Real iFlytek credentials are required; mock is not allowed for this smoke check")
    if not settings.iflytek_digital_human_url:
        raise RuntimeError("IFLYTEK_DIGITAL_HUMAN_URL is not configured")
    if not settings.iflytek_digital_human_avatar_id:
        raise RuntimeError("IFLYTEK_DIGITAL_HUMAN_AVATAR_ID is not configured")

    endpoint = urlparse(settings.iflytek_digital_human_url)
    print(
        json.dumps(
            {
                "requestDomain": endpoint.netloc,
                "apiPath": endpoint.path,
                "startControl": "start",
                "stopControl": "stop",
                "authentication": "WebSocket URL HMAC-SHA256 GET (host/date/authorization)",
                "appId": mask_provider_credential(settings.iflytek_app_id),
                "avatarId": settings.iflytek_digital_human_avatar_id,
                "streamProtocol": "rtmp",
                "serviceIdConfigured": bool(settings.iflytek_digital_human_service_id),
                "voiceId": settings.iflytek_digital_human_voice_id,
                "modelCalled": False,
                "ffmpegStarted": False,
                "textControlSent": False,
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    session = None
    stop_succeeded = False
    try:
        session = await provider.start(
            user_id=USER_ID,
            avatar_id=settings.iflytek_digital_human_avatar_id,
            voice_id=settings.iflytek_digital_human_voice_id,
        )
        print(
            json.dumps(
                {
                    "startSucceeded": True,
                    "providerSessionReceived": bool(session.provider_session),
                    "rtmpStreamReceived": session.stream_url.startswith(("rtmp://", "rtmps://")),
                    "sid": mask_provider_sid(session.sid or ""),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        if session is not None:
            await provider.stop(provider_session=session.provider_session, user_id=USER_ID)
            stop_succeeded = True
            print(json.dumps({"stopSucceeded": stop_succeeded}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        raise SystemExit(sanitize_provider_error(str(exc) or exc.__class__.__name__)) from None
