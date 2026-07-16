import re
import sys
from collections import Counter
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[3]
REPOSITORY_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app


CONTRACT_PATH = REPOSITORY_ROOT / "docs" / "interface-contract.md"
FRONTEND_ROUTER_PATH = REPOSITORY_ROOT / "frontend" / "src" / "router" / "index.ts"
HTTP_METHODS = {"GET", "POST", "PUT", "DELETE", "PATCH"}


def contract_http_routes() -> list[tuple[str, str]]:
    content = CONTRACT_PATH.read_text(encoding="utf-8")
    rows = re.findall(
        r"^\|\s*(GET|POST|PUT|DELETE|PATCH)\s*\|\s*`(/api/v1[^`]*)`",
        content,
        flags=re.MULTILINE,
    )
    return [(method, path.partition("?")[0]) for method, path in rows]


def _walk_fastapi_routes(routes, prefix: str = ""):
    """Flatten FastAPI's lazy included-router nodes without losing duplicates."""
    for route in routes:
        original_router = getattr(route, "original_router", None)
        include_context = getattr(route, "include_context", None)
        if original_router is not None and include_context is not None:
            yield from _walk_fastapi_routes(
                original_router.routes,
                f"{prefix}{include_context.prefix}",
            )
            continue
        yield route, prefix


def fastapi_http_routes() -> list[tuple[str, str]]:
    routes: list[tuple[str, str]] = []
    for route, prefix in _walk_fastapi_routes(app.routes):
        path = f"{prefix}{getattr(route, 'path', '')}"
        if not path.startswith("/api/v1"):
            continue
        for method in getattr(route, "methods", set()):
            if method in HTTP_METHODS:
                routes.append((method, path))
    return routes


def test_contract_health_route_exists():
    response = TestClient(app).get("/api/v1/system/health")
    assert response.status_code == 200


def test_contract_has_exactly_109_unique_http_routes():
    routes = contract_http_routes()
    assert len(routes) == 109
    assert len(set(routes)) == 109


def test_fastapi_routes_have_no_duplicate_method_path_pairs():
    duplicates = [route for route, count in Counter(fastapi_http_routes()).items() if count > 1]
    assert duplicates == []


def test_fastapi_routes_exactly_match_interface_contract():
    contract_routes = set(contract_http_routes())
    actual_routes = set(fastapi_http_routes())
    assert len(actual_routes) == 109
    assert actual_routes == contract_routes


def test_frontend_routes_exactly_match_interface_contract():
    contract = CONTRACT_PATH.read_text(encoding="utf-8")
    route_section = contract.split("## 20.1", maxsplit=1)[1].split("## 20.2", maxsplit=1)[0]
    contract_routes = set(re.findall(r'"(/[^"]+)"', route_section))

    router_source = FRONTEND_ROUTER_PATH.read_text(encoding="utf-8")
    frontend_routes = set(re.findall(r'path:\s*"([^"]+)"', router_source))
    frontend_routes -= {"/", "/dev/agent-flow-test"}

    assert frontend_routes == contract_routes
