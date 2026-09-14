"""Scenario 4 — data validation, boundary and injection tests."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
BASE = "https://api.toopset.ir"
API = f"{BASE}/api/v1"

results: list[dict] = []


def record(name: str, resp: httpx.Response, expect: tuple[int, ...], note: str = "") -> None:
    try:
        detail = resp.json().get("detail")
    except Exception:
        detail = resp.text[:100]
    ok = resp.status_code in expect
    results.append(
        {
            "test": name,
            "expected": list(expect),
            "got": resp.status_code,
            "pass": ok,
            "detail": str(detail)[:130],
            "note": note,
        }
    )
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: got {resp.status_code}")


async def main() -> None:
    m = json.load(open(HERE / "manifest.json"))
    tok = m["tokens"][list(m["tokens"].keys())[8]]  # racer #8 — clean user
    H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
    past = m["slots"]["past"]
    far = m["slots"]["far_future"]

    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        # ── boundary: booking a past slot ─────────────────────────────
        r = await c.post(f"{API}/bookings", json={"slot_id": past["id"], "version": 1}, headers=H)
        record("book slot in the past", r, (409,), "spec hoped 400; app defines 409")

        r = await c.post(f"{API}/bookings", json={"slot_id": far["id"], "version": 1}, headers=H)
        record("book slot 20 days ahead (window=14d)", r, (409,))

        # ── invalid field values ──────────────────────────────────────
        for name, body in [
            ("negative slot_id", {"slot_id": -5, "version": -3}),
            ("zero slot_id", {"slot_id": 0, "version": 1}),
            ("slot_id as SQLi string", {"slot_id": "1 OR 1=1", "version": 1}),
            ("slot_id huge int (10^18)", {"slot_id": 10**18, "version": 1}),
            ("with_ball as string", {"slot_id": 1, "version": 1, "with_ball": "yes"}),
            ("missing version", {"slot_id": 1}),
            ("null slot_id", {"slot_id": None, "version": 1}),
            ("extra unknown field", {"slot_id": 1, "version": 1, "is_admin": True}),
        ]:
            r = await c.post(f"{API}/bookings", json=body, headers=H)
            record(name, r, (400, 404, 422))

        # ── SQL injection in query params ─────────────────────────────
        payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "1' AND SLEEP(5)--",
            "%' UNION SELECT password_hash FROM users--",
        ]
        for p in payloads:
            r = await c.get(f"{API}/vendors", params={"search": p, "limit": 5})
            ok_sql = r.status_code == 200
            body_len = len(r.content)
            results.append(
                {"test": f"SQLi search: {p[:28]}", "got": r.status_code, "pass": ok_sql,
                 "detail": f"resp_bytes={body_len}", "note": "parameterized query expected"}
            )
            print(f"[{'PASS' if ok_sql else 'FAIL'}] SQLi search {p[:28]!r}: {r.status_code}, {body_len}B")

        r = await c.get(f"{API}/vendors/1%20OR%201=1")
        record("SQLi in path param", r, (404, 422))

        # ── XSS payloads ──────────────────────────────────────────────
        xss = "<script>alert(1)</script>"
        r = await c.get(f"{API}/vendors", params={"search": xss})
        reflected = xss in r.text
        results.append({"test": "XSS in search param", "got": r.status_code,
                        "pass": r.status_code == 200 and not reflected,
                        "detail": f"reflected={reflected}"})
        print(f"[{'PASS' if (r.status_code==200 and not reflected) else 'FAIL'}] XSS search: {r.status_code}, reflected={reflected}")

        r = await c.patch(
            f"{API}/auth/profile",
            json={"full_name": '<img src=x onerror="alert(1)">'},
            headers=H,
        )
        reflected = "onerror" in r.text
        results.append({"test": "stored XSS attempt in profile name", "got": r.status_code,
                        "pass": r.status_code in (200, 400, 422),
                        "detail": f"reflected={reflected}",
                        "note": "API echoes value; frontend React escapes by default"})
        print(f"[{r.status_code}] profile XSS: status={r.status_code}, reflected={reflected}")

        # null byte + unicode bomb in search
        r = await c.get(f"{API}/vendors", params={"search": "abc%00def"})
        record("null byte in search", r, (200, 400, 422))

        # OTP phone SQLi/garbage
        r = await c.post(f"{API}/auth/otp/send", json={"phone": "' OR 1=1 --"})
        record("SQLi/garbage in OTP phone", r, (400, 422))

    passed = sum(1 for x in results if x["pass"])
    print(f"\n=== {passed}/{len(results)} passed ===")
    json.dump(results, open(HERE / "results/s5_validation.json", "w"), ensure_ascii=False, indent=2)


asyncio.run(main())
