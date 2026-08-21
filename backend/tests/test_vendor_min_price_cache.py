import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock

from app.services.cache_service import (
    compute_and_cache_weekly_min_prices,
)


class TestVendorMinPriceCache(unittest.TestCase):
    def test_compute_and_cache(self):
        async def run():
            mock_db = AsyncMock()
            mock_res_slots = MagicMock()
            mock_row1 = MagicMock()
            mock_row1.vendor_id = 10
            mock_row1.min_price = 50000.0
            mock_res_slots.all.return_value = [mock_row1]

            mock_res_vendors = MagicMock()
            mock_v1 = MagicMock()
            mock_v1.id = 10
            mock_v2 = MagicMock()
            mock_v2.id = 20
            mock_res_vendors.all.return_value = [mock_v1, mock_v2]

            mock_db.execute.side_effect = [mock_res_slots, mock_res_vendors]

            prices = await compute_and_cache_weekly_min_prices(mock_db)
            self.assertEqual(prices[10], 50000.0)
            self.assertIsNone(prices[20])

        asyncio.run(run())
