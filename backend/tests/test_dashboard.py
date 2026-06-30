"""Tests for dashboard endpoints (aggregate stats for users, managers, admins)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = [pytest.mark.asyncio]


class TestDashboardStats:
    """GET /api/v1/dashboard/stats — any authenticated user."""

    async def test_get_stats_as_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "active_vendors" in data
        assert "today_bookings" in data
        assert "today_revenue" in data
        assert "total_users" in data
        assert "recent_bookings" in data
        assert "popular_vendors" in data
        # All-zero / empty results when DB is empty
        assert data["active_vendors"] == 0
        assert data["today_bookings"] == 0
        assert data["today_revenue"] == 0.0
        assert data["total_users"] >= 1  # test user exists
        assert data["recent_bookings"] == []
        assert data["popular_vendors"] == []

    async def test_get_stats_as_manager(self, client: AsyncClient, manager_token: dict) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert resp.status_code == 200

    async def test_get_stats_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/stats", headers=headers)
        assert resp.status_code == 200

    async def test_get_stats_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/dashboard/stats")
        assert resp.status_code == 401


class TestUserStats:
    """GET /api/v1/dashboard/user-stats — any authenticated user."""

    async def test_get_user_stats_as_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/user-stats", headers=headers)
        # Note: the service raises IndexError for empty bookings on
        # favorite_sport.  This may return 500 until the service is fixed.
        assert resp.status_code == 200, resp.text[:500]
        data = resp.json()
        assert "upcoming_bookings" in data
        assert "completed_bookings" in data
        assert "wallet_balance" in data
        assert "favorite_sport" in data
        assert "recent_bookings" in data

    async def test_get_user_stats_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/dashboard/user-stats")
        assert resp.status_code == 401


class TestManagerStats:
    """GET /api/v1/dashboard/manager-stats — manager or admin only."""

    async def test_get_manager_stats_as_manager(
        self, client: AsyncClient, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/manager-stats", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "my_vendors" in data
        assert "upcoming_bookings" in data
        assert "today_earnings" in data
        assert "wallet_balance" in data
        assert "recent_bookings" in data
        # All-zero / empty results when the manager has no vendors
        assert data["my_vendors"] == 0
        assert data["upcoming_bookings"] == 0
        assert data["today_earnings"] == 0.0
        assert data["wallet_balance"] == 0.0
        assert data["recent_bookings"] == []

    async def test_get_manager_stats_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/manager-stats", headers=headers)
        assert resp.status_code == 200

    async def test_get_manager_stats_as_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/manager-stats", headers=headers)
        assert resp.status_code == 403

    async def test_get_manager_stats_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/dashboard/manager-stats")
        assert resp.status_code == 401


class TestAdminStats:
    """GET /api/v1/dashboard/admin-stats — admin only, with optional date filters."""

    async def test_get_admin_stats_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/admin-stats", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_vendors"] == 0
        assert data["total_users"] >= 1  # admin user exists
        assert data["total_bookings"] == 0
        assert data["total_revenue"] == 0.0
        assert data["active_managers"] == 0
        assert data["pending_bookings"] == 0
        assert data["today_bookings"] == 0
        assert data["today_revenue"] == 0.0
        assert data["recent_bookings"] == []
        assert data["popular_vendors"] == []
        assert data["user_growth"] == []
        assert data["booking_trends"] == []

    async def test_get_admin_stats_with_date_filters(
        self, client: AsyncClient, admin_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get(
            "/api/v1/dashboard/admin-stats",
            params={"date_from": "2026-01-01T00:00:00", "date_to": "2026-12-31T23:59:59"},
            headers=headers,
        )
        assert resp.status_code == 200

    async def test_get_admin_stats_as_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/admin-stats", headers=headers)
        assert resp.status_code == 403

    async def test_get_admin_stats_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/dashboard/admin-stats")
        assert resp.status_code == 401


class TestMonthlyRecap:
    """GET /api/v1/dashboard/admin/monthly-recap — admin only."""

    async def test_get_monthly_recap_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/admin/monthly-recap", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "current_month" in data
        assert "last_month" in data
        assert "changes" in data
        current = data["current_month"]
        assert "label" in current
        assert "bookings" in current
        assert "revenue" in current
        assert "new_users" in current
        last = data["last_month"]
        assert "label" in last
        assert "bookings" in last
        assert "revenue" in last
        assert "new_users" in last
        changes = data["changes"]
        assert "bookings_pct" in changes
        assert "revenue_pct" in changes
        assert "users_pct" in changes
        # No booking or revenue data → zero change
        assert changes["bookings_pct"] == 0.0
        assert changes["revenue_pct"] == 0.0
        # User count: admin fixture was just created this month,
        # so users_pct is either 0 (same month last year had no users)
        # or 100 (current month has new users, last month had 0)
        assert isinstance(changes["users_pct"], float)

    async def test_get_monthly_recap_as_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/admin/monthly-recap", headers=headers)
        assert resp.status_code == 403

    async def test_get_monthly_recap_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/dashboard/admin/monthly-recap")
        assert resp.status_code == 401


class TestAdminCharts:
    """GET /api/v1/dashboard/admin/charts — admin only."""

    async def test_get_admin_charts_as_admin(self, client: AsyncClient, admin_token: dict) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/admin/charts", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "user_growth" in data
        assert "vendor_growth" in data
        assert "booking_trends" in data
        assert "revenue_trends" in data
        # Admin fixture user was just created, so user_growth has today's entry
        assert len(data["user_growth"]) >= 1
        assert data["user_growth"][0]["count"] >= 1
        # No vendor, booking, or revenue data → empty arrays
        assert data["vendor_growth"] == []
        assert data["booking_trends"] == []
        assert data["revenue_trends"] == []

    async def test_get_admin_charts_as_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/admin/charts", headers=headers)
        assert resp.status_code == 403

    async def test_get_admin_charts_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/dashboard/admin/charts")
        assert resp.status_code == 401


class TestManagerRevenue:
    """GET /api/v1/dashboard/manager/revenue — manager or admin only, with optional date filters."""

    async def test_get_manager_revenue_as_manager(
        self, client: AsyncClient, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/manager/revenue", headers=headers)
        assert resp.status_code == 200
        # Returns a list — empty when no vendors/bookings
        assert resp.json() == []

    async def test_get_manager_revenue_as_admin(
        self, client: AsyncClient, admin_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {admin_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/manager/revenue", headers=headers)
        assert resp.status_code == 200

    async def test_get_manager_revenue_with_date_filters(
        self, client: AsyncClient, manager_token: dict
    ) -> None:
        headers = {"Authorization": f"Bearer {manager_token['access_token']}"}
        resp = await client.get(
            "/api/v1/dashboard/manager/revenue",
            params={"date_from": "2026-01-01T00:00:00", "date_to": "2026-12-31T23:59:59"},
            headers=headers,
        )
        assert resp.status_code == 200

    async def test_get_manager_revenue_as_user(self, client: AsyncClient, user_token: dict) -> None:
        headers = {"Authorization": f"Bearer {user_token['access_token']}"}
        resp = await client.get("/api/v1/dashboard/manager/revenue", headers=headers)
        assert resp.status_code == 403

    async def test_get_manager_revenue_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/dashboard/manager/revenue")
        assert resp.status_code == 401
