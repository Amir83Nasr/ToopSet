"""Scenario 2 — auth, RBAC and IDOR matrix against the live API."""

from __future__ import annotations

import base64
import json
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
BASE = "https://api.toopset.ir"
API = f"{BASE}/api/v1"

results: list[dict] = []


def b64u(obj: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()


def record(name: str, expected: int, resp: httpx.Response, note: str = "") -> None:
    try:
        detail = resp.json().get("detail")
    except Exception:
        detail = resp.text[:100]
    results.append(
        {
            "test": name,
            "expected": expected,
            "got": resp.status_code,
            "pass": resp.status_code == expected,
            "detail": str(detail)[:110],
            "note": note,
        }
    )
    mark = "PASS" if resp.status_code == expected else "FAIL"
    print(f"[{mark}] {name}: expect {expected} → got {resp.status_code} {note}")


async def main() -> None:
    m = json.load(open(HERE / "manifest.json"))
    tok_a = m["user_a"]["token"]
    tok_b = m["user_b"]["token"]
    valid = tok_a
    H = {"Authorization": f"Bearer {valid}"}

    async with httpx.AsyncClient(base_url=BASE, timeout=30) as c:
        # ── authentication ────────────────────────────────────────────
        r = await c.get(f"{API}/bookings")
        record("no token → my bookings", 401, r)

        r = await c.get(f"{API}/bookings", headers={"Authorization": "Bearer garbage.token.here"})
        record("malformed token", 401, r)

        none_tok = f'{b64u({"alg": "none", "typ": "JWT"})}.{b64u({"sub": "1", "type": "access", "iss": "toopset-api", "aud": "toopset-client"})}.'
        r = await c.get(f"{API}/bookings", headers={"Authorization": f"Bearer {none_tok}"})
        record("alg=none token", 401, r)

        tampered = valid[:-3] + ("AAA" if not valid.endswith("AAA") else "BBB")
        r = await c.get(f"{API}/bookings", headers={"Authorization": f"Bearer {tampered}"})
        record("tampered signature", 401, r)

        r = await c.get(f"{API}/bookings", headers={"Authorization": f"Bearer {m['expired_token']}"})
        record("expired token (valid sig, exp −30m)", 401, r)

        r = await c.get(f"{API}/bookings", headers={"Authorization": f"Bearer {m['refresh_token']}"})
        record("refresh token as access", 401, r)

        r = await c.get(f"{API}/auth/me", headers=H)
        record("valid token sanity check", 200, r)

        # ── IDOR ──────────────────────────────────────────────────────
        slot = m["slots"]["idor"]
        r = await c.post(
            f"{API}/bookings",
            json={"slot_id": slot["id"], "version": slot["version"], "with_ball": False},
            headers={"Authorization": f"Bearer {tok_b}"},
        )
        record("user B books slot (setup)", 201, r)
        b_booking = r.json().get("id")

        r = await c.get(f"{API}/bookings/{b_booking}", headers=H)
        record(f"IDOR: A reads B's booking #{b_booking}", 403, r)

        r = await c.post(
            f"{API}/bookings/{b_booking}/cancel",
            json={"accepted_terms": True},
            headers=H,
        )
        record(f"IDOR: A cancels B's booking #{b_booking}", 403, r)

        # A's own booking (the race winner on slot 183) — should be readable
        r = await c.get(f"{API}/bookings", headers=H)
        record("A lists own bookings", 200, r)

        # ── privilege escalation ──────────────────────────────────────
        r = await c.get(f"{API}/users", headers=H)
        record("user → GET /admin-style /users list", 403, r)

        r = await c.get(f"{API}/bookings/all", headers=H)
        record("user → GET /bookings/all (admin)", 403, r)

        r = await c.get(f"{API}/admin/settings", headers=H)
        record("user → GET /admin/settings", 403, r)

        r = await c.get(f"{API}/admin/logs", headers=H)
        record("user → GET /admin/logs", 403, r)

        r = await c.get(f"{API}/admin/settings")
        record("no token → /admin/settings", 401, r)

        r = await c.post(
            f"{API}/vendors/{m['vendor_id']}/slots",
            json={"start_time": "2026-10-01T10:00:00Z", "end_time": "2026-10-01T11:00:00Z", "base_price": 100000},
            headers=H,
        )
        record("user → create slot (manager route)", 403, r)

        # cleanup: B cancels own booking so the IDOR slot is freed again
        r = await c.post(
            f"{API}/bookings/{b_booking}/cancel",
            json={"accepted_terms": True},
            headers={"Authorization": f"Bearer {tok_b}"},
        )
        record("cleanup: B cancels own booking", 200, r)

    passed = sum(1 for x in results if x["pass"])
    print(f"\n=== {passed}/{len(results)} passed ===")
    json.dump(results, open(HERE / "results/s2_auth.json", "w"), ensure_ascii=False, indent=2)


import asyncio

asyncio.run(main())
