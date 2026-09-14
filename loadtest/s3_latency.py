"""Scenario 3a — latency benchmark on read endpoints + booking create."""

from __future__ import annotations

import asyncio
import json
import random
import time
from pathlib import Path
from statistics import mean, quantiles

import httpx

HERE = Path(__file__).resolve().parent
BASE = "https://api.toopset.ir"
API = f"{BASE}/api/v1"


def pct(samples: list[float], p: float) -> float:
    s = sorted(samples)
    if len(s) == 1:
        return s[0]
    q = quantiles(s, n=100, method="inclusive")
    return q[min(99, max(0, int(p) - 1))]


async def bench(c: httpx.AsyncClient, name: str, fn, n: int, conc: int) -> dict:
    lat: list[float] = []
    codes: dict[int, int] = {}
    sem = asyncio.Semaphore(conc)

    async def one():
        async with sem:
            t = time.perf_counter()
            try:
                r = await fn()
                lat.append((time.perf_counter() - t) * 1000)
                codes[r.status_code] = codes.get(r.status_code, 0) + 1
            except Exception as e:
                lat.append((time.perf_counter() - t) * 1000)
                codes[-1] = codes.get(-1, 0) + 1

    t0 = time.perf_counter()
    await asyncio.gather(*[one() for _ in range(n)])
    wall = time.perf_counter() - t0
    out = {
        "endpoint": name,
        "n": n,
        "concurrency": conc,
        "rps": round(n / wall, 1),
        "mean_ms": round(mean(lat), 0),
        "p50_ms": round(pct(lat, 50), 0),
        "p95_ms": round(pct(lat, 95), 0),
        "p99_ms": round(pct(lat, 99), 0),
        "max_ms": round(max(lat), 0),
        "status": {str(k): v for k, v in codes.items()},
    }
    print(json.dumps(out, ensure_ascii=False))
    return out


async def main() -> None:
    m = json.load(open(HERE / "manifest.json"))
    tok = m["user_a"]["token"]
    H = {"Authorization": f"Bearer {tok}"}
    vid = m["vendor_id"]
    slot_ids = [s["id"] for s in m["slots"].values()]

    results = []
    async with httpx.AsyncClient(base_url=BASE, timeout=30, limits=httpx.Limits(max_connections=10)) as c:
        # warm caches
        await c.get(f"{API}/vendors")
        await c.get(f"{API}/vendors/{vid}")

        results.append(await bench(c, "GET /vendors (list)", lambda: c.get(f"{API}/vendors?limit=20"), 40, 1))
        results.append(await bench(c, "GET /vendors/{id} (detail)", lambda: c.get(f"{API}/vendors/{vid}"), 40, 1))
        results.append(
            await bench(
                c,
                "GET /vendors/{id}/slots",
                lambda: c.get(f"{API}/vendors/{vid}/slots?limit=50"),
                40,
                1,
            )
        )
        results.append(
            await bench(
                c,
                "GET /slots/{id} (detail)",
                lambda: c.get(f"{API}/slots/{random.choice(slot_ids)}"),
                40,
                1,
            )
        )
        results.append(await bench(c, "GET /bookings (authed)", lambda: c.get(f"{API}/bookings", headers=H), 40, 1))
        results.append(await bench(c, "GET /auth/me", lambda: c.get(f"{API}/auth/me", headers=H), 40, 1))
        # light concurrency view of the heaviest read
        results.append(
            await bench(c, "GET /vendors/{id}/slots @c5", lambda: c.get(f"{API}/vendors/{vid}/slots?limit=50"), 40, 5)
        )

        # booking create latency — 3 sequential single-user creates on spare slots
        spare = [m["slots"][k]["id"] for k in ("fill_1_8", "fill_1_10", "fill_1_12")]

        async def book_once(slot_id: int):
            return await c.post(
                f"{API}/bookings",
                json={"slot_id": slot_id, "version": 1, "with_ball": False},
                headers=H,
            )

        for sid in spare:
            r = await book_once(sid)
            ms = r.elapsed.total_seconds() * 1000
            entry = {
                "endpoint": f"POST /bookings (slot {sid})",
                "status": r.status_code,
                "latency_ms": round(ms, 0),
            }
            print(json.dumps(entry, ensure_ascii=False))
            results.append({"endpoint": entry["endpoint"], "n": 1, "status": entry["status"], "latency_ms": entry["latency_ms"]})

    json.dump(results, open(HERE / "results/s3_latency.json", "w"), ensure_ascii=False, indent=2)


asyncio.run(main())
