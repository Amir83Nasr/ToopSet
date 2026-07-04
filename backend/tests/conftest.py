"""Test fixtures: FastAPI app overrides + transactional DB isolation."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import NullPool, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

TEST_DB_URL = "postgresql+asyncpg://toopset:toopset_secret@localhost:5432/toopset_test"

engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)

# ── Disable rate limiting for tests ────────────────────────────────────
# SlowAPIMiddleware checks limiter.enabled before enforcing. Setting disabled
# makes the middleware a pass-through while keeping the attribute available.
from app.core.rate_limiter import limiter as _app_limiter  # noqa: E402

_app_limiter.enabled = False
settings.refresh_cookie_secure = False
settings.bootstrap_admin_secret = "test-bootstrap-secret"
settings.allow_audit_log_deletion = True

# ── Strip PrometheusMiddleware for tests ──────────────────────────────
# BaseHTTPMiddleware wraps requests in an anyio TaskGroup whose tasks can
# outlive pytest-asyncio's per-function event loop in Python 3.14, causing
# RuntimeError.  We remove it and force FastAPI to rebuild the stack.
from app.core.metrics import PrometheusMiddleware as _PrometheusMiddleware  # noqa: E402

app.user_middleware = [m for m in app.user_middleware if m.cls is not _PrometheusMiddleware]
app.middleware_stack = None  # force rebuild on first request


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before test session, drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional test session — rolled back after each test."""
    conn = await engine.connect()
    trans = await conn.begin()
    s = AsyncSession(bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
    yield s
    await s.close()
    await trans.rollback()
    await conn.close()


@pytest_asyncio.fixture
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with overridden DB dependency."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, Any]:
        yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Auth helpers ─────────────────────────────────────────────────────────────


async def _register_and_promote(
    client: AsyncClient, session: AsyncSession, phone: str, role: str
) -> dict[str, Any]:
    """Register a user, promote to *role* via raw SQL, re-login for fresh JWT."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"phone": phone, "password": "Test1234", "full_name": "test"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    user_id = data["user"]["id"]

    await session.execute(
        text("UPDATE users SET role = :role WHERE id = :id"),
        {"role": role, "id": user_id},
    )
    await session.flush()

    resp2 = await client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "password": "Test1234"},
    )
    assert resp2.status_code == 200, resp2.text
    data2 = resp2.json()
    return {
        "access_token": data2["access_token"],
        "refresh_token": client.cookies.get(settings.refresh_cookie_name),
        "user": data2["user"],
    }


@pytest_asyncio.fixture
async def user_token(client: AsyncClient, session: AsyncSession) -> dict[str, Any]:
    """Register a regular user (unique phone per fixture)."""
    return await _register_and_promote(client, session, "09120000000", "user")


@pytest_asyncio.fixture
async def manager_token(client: AsyncClient, session: AsyncSession) -> dict[str, Any]:
    """Register a manager (unique phone per fixture)."""
    return await _register_and_promote(client, session, "09120000001", "manager")


@pytest_asyncio.fixture
async def admin_token(client: AsyncClient, session: AsyncSession) -> dict[str, Any]:
    """Register an admin (unique phone per fixture)."""
    return await _register_and_promote(client, session, "09120000002", "admin")


def auth_headers(token_info: dict[str, Any]) -> dict[str, str]:
    """Build Authorization header from token fixture."""
    return {"Authorization": f"Bearer {token_info['access_token']}"}
