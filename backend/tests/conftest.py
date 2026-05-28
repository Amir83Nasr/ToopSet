from __future__ import annotations

import asyncio
from typing import AsyncGenerator

import httpx
import pytest
import pytest_asyncio


# Basic fixture for async test support
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    """Create an HTTP client for testing (basic, no app override)."""
    async with httpx.AsyncClient(base_url="http://test") as ac:
        yield ac
