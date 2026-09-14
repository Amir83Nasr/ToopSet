"""Scenario 1 — race condition over HTTP.

N concurrent authenticated POST /api/v1/bookings on one open slot.
All requests released simultaneously through a barrier; connections are
pre-warmed so TLS handshakes don't smear the burst.

Usage:
    uv run python s1_race.py <slot_key> <n_users> <out_json>
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
BASE = "https://api.toopset.ir"
API = f"{BASE}/api/v1"


async def run(slot_key: str, n: int, out_path: str) -> None:
    manifest = json.load(open(HERE / "manifest.json"))
    slot = manifest["slots"][slot_key]
    tokens = list(manifest["tokens"].values())[:n]

    results: list[dict] = []
    barrier = asyncio.Barrier(n + 1)
    limits = httpx.Limits(max_connections=n + 10, max_keepalive_connections=n + 10)
    t0 = 0.0

    async with httpx.AsyncClient(base_url=BASE, limits=limits, timeout=30) as client:
        # warm the pool: one cheap request per connection
        async def warm(i: int):
            for _ in range(2):
                await client.get("/health")

        await asyncio.gather(*[warm(i) for i in range(min(n, 32))])

        async def racer(i: int, token: str) -> None:
            await barrier.wait()  # type: ignore[attr-defined]
            t = time.perf_counter()
            try:
                r = await client.post(
                    f"{API}/bookings",
                    json={"slot_id": slot["id"], "version": slot["version"], "with_ball": False},
                    headers={"Authorization": f"Bearer {token}"},
                )
                elapsed = time.perf_counter() - t
                try:
                    detail = r.json().get("detail")
                except Exception:
                    detail = r.text[:120]
                results.append(
                    {
                        "i": i,
                        "status": r.status_code,
                        "elapsed_ms": round(elapsed * 1000, 1),
                        "detail": str(detail)[:160],
                    }
                )
            except Exception as e:  # network-level failure
                results.append(
                    {"i": i, "status": -1, "elapsed_ms": round((time.perf_counter() - t) * 1000, 1),
                     "detail": f"{type(e).__name__}: {e}"}
                )

        tasks = [asyncio.create_task(racer(i, tok)) for i, tok in enumerate(tokens)]
        await barrier.wait()  # type: ignore[attr-defined]
        t0 = time.perf_counter()
        await asyncio.gather(*tasks)
        wall = time.perf_counter() - t0

    codes: dict[int, int] = {}
    for r in results:
        codes[r["status"]] = codes.get(r["status"], 0) + 1
    created = [r for r in results if r["status"] in (200, 201)]
    summary = {
        "slot_key": slot_key,
        "slot_id": slot["id"],
        "n_requests": n,
        "wall_ms": round(wall * 1000, 1),
        "status_counts": {str(k): v for k, v in sorted(codes.items())},
        "n_created": len(created),
        "created_detail": created,
        "results": sorted(results, key=lambda r: r["i"]),
    }
    print(json.dumps({k: v for k, v in summary.items() if k != "results"}, ensure_ascii=False, indent=2))
    json.dump(summary, open(out_path, "w"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    asyncio.run(run(sys.argv[1], int(sys.argv[2]), sys.argv[3]))
