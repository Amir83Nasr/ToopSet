from __future__ import annotations

from collections.abc import Coroutine
from typing import Any

import pytest

import app.main as main_module


@pytest.mark.asyncio
async def test_app_lifespan_starts_background_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    created: list[str] = []
    cancelled: list[str] = []

    class FakeTask:
        def __init__(self, name: str) -> None:
            self.name = name

        def cancel(self) -> None:
            cancelled.append(self.name)

    def fake_create_task(coro: Coroutine[Any, Any, Any]) -> FakeTask:
        name = coro.cr_code.co_name
        created.append(name)
        coro.close()
        return FakeTask(name)

    async def noop() -> None:
        return None

    class FakeEngine:
        dispose = staticmethod(noop)

    monkeypatch.setattr(main_module.asyncio, "create_task", fake_create_task)
    monkeypatch.setattr(main_module, "setup_logging", lambda: None)
    monkeypatch.setattr(main_module, "validate_env", lambda settings: None)
    monkeypatch.setattr(main_module, "close_redis", noop)
    monkeypatch.setattr(main_module, "engine", FakeEngine())
    monkeypatch.setattr(main_module.settings, "auto_migrate", False)
    monkeypatch.setattr(main_module.settings, "otel_enabled", False)
    monkeypatch.setattr(main_module.settings, "sentry_dsn", "")

    async with main_module.app.router.lifespan_context(main_module.app):
        pass

    expected = [
        "_refresh_metrics_periodically",
        "_cancel_expired_pending",
        "_reconcile_zibal_payments_periodically",
        "_expire_replacement_work_periodically",
        "_update_vendor_min_prices_nightly",
    ]
    assert created == expected
    assert cancelled == expected


@pytest.mark.asyncio
async def test_app_lifespan_starts_eitaa_job_only_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from pydantic import SecretStr

    created: list[str] = []
    cancelled: list[str] = []

    class FakeTask:
        def __init__(self, name: str) -> None:
            self.name = name

        def cancel(self) -> None:
            cancelled.append(self.name)

    def fake_create_task(coro: Coroutine[Any, Any, Any]) -> FakeTask:
        created.append(coro.cr_code.co_name)
        coro.close()
        return FakeTask(coro.cr_code.co_name)

    async def noop() -> None:
        return None

    class FakeEngine:
        dispose = staticmethod(noop)

    monkeypatch.setattr(main_module.asyncio, "create_task", fake_create_task)
    monkeypatch.setattr(main_module, "setup_logging", lambda: None)
    monkeypatch.setattr(main_module, "validate_env", lambda settings: None)
    monkeypatch.setattr(main_module, "close_redis", noop)
    monkeypatch.setattr(main_module, "engine", FakeEngine())
    monkeypatch.setattr(main_module.settings, "auto_migrate", False)
    monkeypatch.setattr(main_module.settings, "otel_enabled", False)
    monkeypatch.setattr(main_module.settings, "sentry_dsn", "")
    monkeypatch.setattr(main_module.settings, "eitaa_bot_token", SecretStr("token"))
    monkeypatch.setattr(main_module.settings, "eitaa_channel_id", "@channel")

    async with main_module.app.router.lifespan_context(main_module.app):
        pass

    assert "_post_eitaa_empty_slots_daily" in created
    assert "_post_eitaa_empty_slots_daily" in cancelled
