"""Tests for wallet endpoints (balance, deposit, withdraw, transactions)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select

from app.models.bank_card import BankCard

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


class TestBankCards:
    async def test_user_can_have_only_one_verified_card_and_replace_it(
        self, client: AsyncClient, session, user_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        user_id = user_token["user"]["id"]

        first_lookup = await client.post(
            "/api/v1/wallet/bank-cards/lookup",
            json={"card_number": "6037991234567891"},
            headers=headers,
        )
        assert first_lookup.status_code == 200
        first_card = first_lookup.json()

        first_confirm = await client.post(
            f"/api/v1/wallet/bank-cards/{first_card['id']}/confirm",
            headers=headers,
        )
        assert first_confirm.status_code == 200
        assert first_confirm.json()["masked_card_number"] == "6037-****-****-7891"

        second_lookup = await client.post(
            "/api/v1/wallet/bank-cards/lookup",
            json={"card_number": "5892101234567890"},
            headers=headers,
        )
        assert second_lookup.status_code == 200
        second_card = second_lookup.json()
        assert second_card["id"] == first_card["id"]

        second_confirm = await client.post(
            f"/api/v1/wallet/bank-cards/{second_card['id']}/confirm",
            headers=headers,
        )
        assert second_confirm.status_code == 200
        assert second_confirm.json()["masked_card_number"] == "5892-****-****-7890"

        verified = await client.get("/api/v1/wallet/bank-cards/verified", headers=headers)
        assert verified.status_code == 200
        assert verified.json()["masked_card_number"] == "5892-****-****-7890"

        count = await session.scalar(
            select(func.count()).select_from(BankCard).where(BankCard.user_id == user_id)
        )
        assert count == 1
