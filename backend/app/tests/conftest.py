import os

import pytest

os.environ["ENABLE_MOCK"] = "true"


@pytest.fixture(autouse=True)
def force_mock_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import settings

    monkeypatch.setattr(settings, "enable_mock", True)
