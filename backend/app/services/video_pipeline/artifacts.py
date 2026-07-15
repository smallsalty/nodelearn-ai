from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from app.core.config import settings


class DebugArtifactStore:
    """Non-public development artifacts for replay and diagnosis."""

    def __init__(self, task_id: str) -> None:
        repo_root = Path(__file__).resolve().parents[4]
        self.directory = repo_root / "output" / "video-debug" / task_id
        self.enabled = settings.app_env.lower() not in {"production", "prod"}
        if self.enabled:
            self.directory.mkdir(parents=True, exist_ok=True)

    def write(self, filename: str, value: Any) -> None:
        if not self.enabled:
            return
        if isinstance(value, BaseModel):
            value = value.model_dump(mode="json")
        path = self.directory / filename
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
