from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel


def serialize_contract(data: Any) -> Any:
    if isinstance(data, BaseModel):
        return data.model_dump(by_alias=True)
    if isinstance(data, list):
        return [serialize_contract(item) for item in data]
    if isinstance(data, dict):
        return {key: serialize_contract(value) for key, value in data.items()}
    return data


def success_response(data: Any = None, message: str = "success", code: int = 200) -> dict[str, Any]:
    return {
        "code": code,
        "message": message,
        "data": serialize_contract(data),
        "traceId": f"trace_{uuid4().hex}",
        "timestamp": datetime.now(UTC).isoformat(),
    }


def error_response(message: str, data: Any = None, code: int = 500) -> dict[str, Any]:
    return {
        "code": code,
        "message": message,
        "data": serialize_contract(data),
        "traceId": f"trace_{uuid4().hex}",
        "timestamp": datetime.now(UTC).isoformat(),
    }


def page_result(items: list[Any], total: int, page: int, page_size: int) -> dict[str, Any]:
    return {
        "list": serialize_contract(items),
        "total": total,
        "page": page,
        "pageSize": page_size,
    }
