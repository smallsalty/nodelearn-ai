from pathlib import Path


def test_judge0_docker_desktop_uses_process_limits_without_cgroup_v1():
    root = Path(__file__).resolve().parents[4]
    contract = (root / "docs" / "interface-contract.md").read_text(encoding="utf-8")
    config = (root / "docker" / "judge0.conf").read_text(encoding="utf-8")
    compose = (root / "docker" / "docker-compose.yml").read_text(encoding="utf-8")

    names = (
        "ENABLE_PER_PROCESS_AND_THREAD_TIME_LIMIT",
        "ENABLE_PER_PROCESS_AND_THREAD_MEMORY_LIMIT",
    )
    for name in names:
        assert f"{name}=true" in contract
        assert f"{name}=true" in config

    assert "judge0-worker:" in compose
    assert "privileged: true" in compose
