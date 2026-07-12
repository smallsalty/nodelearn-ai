import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from fastapi.testclient import TestClient

from app.main import app


def test_contract_health_route_exists():
    client = TestClient(app)
    response = client.get("/api/v1/system/health")
    assert response.status_code == 200


def test_contract_route_prefixes_are_api_v1():
    paths = [route.path for route in app.routes if hasattr(route, "path")]
    contract_paths = [path for path in paths if path.startswith("/api/v1")]
    assert "/api/v1/system/health" in contract_paths
    assert "/api/v1/multimodal/digital-human/sessions/{sessionId}/live" in contract_paths
    assert "/api/v1/multimodal/digital-human/sessions/{sessionId}/stop" in contract_paths
    # TODO: compare every route against docs/interface-contract.md.
