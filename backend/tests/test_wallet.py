"""Tests for wallet endpoints (balance, deposit, withdraw, transactions)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]


class TestBalance:
    async def test_initial_balance(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/wallet/balance", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["balance"] == 0.0

    async def test_balance_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/wallet/balance")
        assert resp.status_code == 401


class TestDeposit:
    async def test_deposit_success(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/wallet/deposit",
            json={"amount": 50000},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["balance"] == 50000.0

    async def test_deposit_negative_amount(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/wallet/deposit",
            json={"amount": -1000},
            headers=headers,
        )
        assert resp.status_code == 400
        assert "مثبت" in resp.json()["detail"]

    async def test_deposit_zero_amount(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/wallet/deposit",
            json={"amount": 0},
            headers=headers,
        )
        assert resp.status_code == 400


class TestWithdraw:
    async def test_withdraw_success(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        # Deposit first
        await client.post("/api/v1/wallet/deposit", json={"amount": 50000}, headers=headers)

        resp = await client.post(
            "/api/v1/wallet/withdraw",
            json={"amount": 20000},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["balance"] == 30000.0

    async def test_withdraw_insufficient(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/wallet/withdraw",
            json={"amount": 1000},
            headers=headers,
        )
        assert resp.status_code == 400
        assert "کافی" in resp.json()["detail"]

    async def test_withdraw_negative_amount(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.post(
            "/api/v1/wallet/withdraw",
            json={"amount": -100},
            headers=headers,
        )
        assert resp.status_code == 400


class TestTransactions:
    async def test_transactions_initial_empty(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/wallet/transactions", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_transactions_after_deposit(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        await client.post("/api/v1/wallet/deposit", json={"amount": 30000}, headers=headers)

        resp = await client.get("/api/v1/wallet/transactions", headers=headers)
        assert resp.status_code == 200
        txs = resp.json()
        assert len(txs) == 1
        assert txs[0]["amount"] == 30000.0
        assert txs[0]["type"] == "deposit"
