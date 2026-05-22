import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app


def test_response_uses_api_response_envelope():
    client = TestClient(app)
    payload = client.get("/api/v1/system/health").json()
    assert set(["code", "message", "data", "traceId", "timestamp"]).issubset(payload.keys())
    # TODO: validate all non-stream HTTP routes return ApiResponse<T>.
