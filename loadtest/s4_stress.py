"""Scenario 3b — staged stress ramp (10 → 500 concurrent) on public reads.

Each stage runs a fixed duration; workers issue random requests from a
realistic mix (vendor search / detail / slots list / slot detail). The ramp
stops early once a stage clearly fails (>10% non-2xx or >20% connection
errors) — the breaking point has then been found.

Also samples /metrics (process CPU seconds, RSS) before/after each stage.
"""

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
STAGES = [10, 25, 50, 100, 200, 350, 500]
STAGE_SECONDS = 20

SPORTS = ["football", "futsal", "basketball", "volleyball", "handball"]


def pct(samples: list[float], p: float) -> float:
    if not samples:
        return -1
    s = sorted(samples)
    if len(s) < 3:
        return s[len(s) // 2]
    q = quantiles(s, n=100, method="inclusive")
    return q[max(0, min(99, int(p) - 1))]


async def sample_metrics(c: httpx.AsyncClient) -> dict:
    try:
        r = await c.get(f"{BASE}/metrics")
        cpu = mem = None
        for line in r.text.splitlines():
            if line.startswith("process_cpu_seconds_total"):
                cpu = float(line.split()[1])
            elif line.startswith("process_resident_memory_bytes"):
                mem = float(line.split()[1])
        return {"cpu_s": cpu, "rss_mb": round((mem or 0) / 1e6, 1)}
    except Exception:
        return {}


async def run_stage(c_factory, n: int, slot_ids: list[int]) -> dict:
    stop = time.perf_counter() + STAGE_SECONDS
    lat: list[float] = []
    codes: dict[int, int] = {}
    errors = 0
    total = 0

    async def worker(client: httpx.AsyncClient):
        nonlocal errors, total
        while time.perf_counter() < stop:
            pick = random.random()
            try:
                t = time.perf_counter()
                if pick < 0.40:
                    r = await client.get(
                        f"{API}/vendors",
                        params={"limit": random.choice([10, 20, 50]), "search": random.choice(["", "تست", "زمین"]), "sport_type": random.choice(SPORTS)},
                    )
                elif pick < 0.60:
                    r = await client.get(f"{API}/vendors/1")
                elif pick < 0.85:
                    r = await client.get(f"{API}/vendors/3/slots", params={"limit": 50})
                else:
                    r = await client.get(f"{API}/slots/{random.choice(slot_ids)}")
                lat.append((time.perf_counter() - t) * 1000)
                codes[r.status_code] = codes.get(r.status_code, 0) + 1
                total += 1
            except Exception:
                errors += 1
                total += 1

    clients = [c_factory() for _ in range(n)]
    async with asyncio.TaskGroup() as tg:
        for cl in clients:
            tg.create_task(worker(cl))
    for cl in clients:
        await cl.aclose()

    wall = STAGE_SECONDS
    non2xx = sum(v for k, v in codes.items() if k >= 300)
    stage = {
        "concurrency": n,
        "duration_s": wall,
        "total_requests": total,
        "rps": round(total / wall, 1),
        "conn_errors": errors,
        "error_pct": round(100 * (errors + non2xx) / max(1, total), 1),
        "mean_ms": round(mean(lat)) if lat else -1,
        "p50_ms": round(pct(lat, 50)),
        "p95_ms": round(pct(lat, 95)),
        "p99_ms": round(pct(lat, 99)),
        "status": {str(k): v for k, v in sorted(codes.items())},
    }
    print(json.dumps(stage, ensure_ascii=False))
    return stage


async def main() -> None:
    m = json.load(open(HERE / "manifest.json"))
    slot_ids = [s["id"] for s in m["slots"].values()]

    def c_factory():
        return httpx.AsyncClient(
            base_url=BASE,
            timeout=httpx.Timeout(30, connect=10),
            limits=httpx.Limits(max_connections=8, max_keepalive_connections=8),
        )

    stages_out = []
    async with httpx.AsyncClient(base_url=BASE, timeout=10) as probe:
        m0 = await sample_metrics(probe)
        print("baseline metrics:", m0)
        for n in STAGES:
            pre = await sample_metrics(probe)
            stage = await run_stage(c_factory, n, slot_ids)
            post = await sample_metrics(probe)
            stage["pod_cpu_seconds_delta"] = round((post["cpu_s"] or 0) - (pre["cpu_s"] or 0), 1)
            stage["pod_rss_mb"] = post.get("rss_mb")
            stages_out.append(stage)
            broken = stage["error_pct"] > 10 or stage["conn_errors"] > 0.2 * max(1, stage["total_requests"])
            if broken:
                print(f"--- breaking point reached at concurrency={n}; stopping ramp ---")
                break
            await asyncio.sleep(5)

    json.dump(stages_out, open(HERE / "results/s4_stress.json", "w"), ensure_ascii=False, indent=2)


asyncio.run(main())
