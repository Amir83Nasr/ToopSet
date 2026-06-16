# Rate Limiting for Auth Endpoints & Timezone Fix in Booking Slots

**Date:** 2026-06-16
**Version:** 0.3.1
**Author:** Claude (brainstorming → writing-plans pipeline)

---

## Table of Contents

1. [Rate Limiting for Auth Endpoints](#1-rate-limiting-for-auth-endpoints)
2. [Timezone Fix for Booking Slots](#2-timezone-fix-for-booking-slots)
3. [Files Changed](#3-files-changed)
4. [Implementation Order](#4-implementation-order)

---

## 1. Rate Limiting for Auth Endpoints

### Problem
Auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`) have no rate limiting, leaving the platform vulnerable to brute-force attacks and spam registration.

### Approach
Use [slowapi](https://github.com/la4de/slowapi) — a well-known FastAPI rate-limiting library backed by Redis — with a layered rate-limit strategy per endpoint. Redis is already configured in the project (`app/core/redis_client.py`).

### Rate Limits

| Endpoint | Limit | Reasoning |
|---|---|---|
| `POST /auth/login` | 5/minute | Prevent brute-force password guessing |
| `POST /auth/register` | 3/minute | Prevent spam account creation |
| `POST /auth/refresh` | 10/minute | Light limit — tokens expire every 30 min |

### Key
Combination of client IP + endpoint path (`{ip}:{path}`). This gives fair isolation per user without tying to authenticated state (which doesn't exist yet for login/register).

### Implementation

**New file:** `backend/app/core/rate_limiter.py`
- Initialize a `Limiter` instance with a Redis-backed `RedisRateLimiter` storage.
- Register a custom error handler for `429 Too Many Requests` — returns Persian message:
  `"تعداد درخواست‌های مجاز شما به پایان رسیده است. لطفاً کمی بعد تلاش کنید."`

**Modified file:** `backend/app/main.py`
- Import `rate_limiter` module (it registers itself on app via lifespan or startup).
- Add `@limiter.limit("5/minute")` decorators to auth endpoints in `backend/app/api/v1/auth.py`.

**Modified file:** `backend/requirements.txt`
- Add `slowapi>=0.1.9`

### Error Handling
- slowapi raises a custom `HTTPException(status_code=429)` when the limit is exceeded. We map this to the global exception handler to ensure Persian response format.

### Testing
- Use test client to hit auth endpoints rapidly and verify 429 is returned after exceeding the limit.
- No persistence needed — in-memory/Redis stores reset automatically.

---

## 2. Timezone Fix for Booking Slots

### Problem
The system has no concept of Iran timezone (`Asia/Tehran`, UTC+3:30 in winter, UTC+4:30 in summer). This causes incorrect comparisons, particularly:

1. **`generate_slots()`** creates naive datetimes via `datetime.combine(current, ...)` — no timezone. PostgreSQL stores them as-is, leading to off-by-3.5h errors.
2. **`cancel_booking()`** compares `datetime.now(timezone.utc)` with `slot.start_time` — if `start_time` is actually Iran local time stored naively, the comparison is wrong.
3. **Date filtering in `list_slots()`** does not account for timezone offset when filtering by date.
4. **No central timezone constant** — timezone information is scattered and inconsistent.

### Root Cause
- `TimeSlot.start_time` and `end_time` are `DateTime(timezone=True)` in the model, but the values passed in are naive Python datetimes. PostgreSQL assumes naive values are in the server's timezone (or raises a warning), and the ORM layer doesn't enforce.
- Iran is UTC+3:30 minimum, so a 14:00 Tehran slot is stored as if it were 14:00 UTC, causing all comparisons to be off by ~3.5 hours.

### Approach
1. Define `Asia/Tehran` as the single source of truth for user-facing time.
2. Store all datetimes in PostgreSQL in UTC (as is current practice where `DateTime(timezone=True)` is used).
3. Convert **input** datetimes from Iran→UTC before writing to DB.
4. Convert **output** datetimes from UTC→Iran before sending to client (via Pydantic serializers or service layer).
5. All internal comparisons (e.g., cancel booking) remain in UTC which is safe and unambiguous.

### Implementation

**New file:** `backend/app/core/timezone.py`
```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

IRAN_TZ = ZoneInfo("Asia/Tehran")

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def now_iran() -> datetime:
    return datetime.now(IRAN_TZ)

def iran_to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IRAN_TZ)
    return dt.astimezone(timezone.utc)

def utc_to_iran(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=dt.tzinfo)
    else:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IRAN_TZ)

def is_iran_dst(dt: datetime | None = None) -> bool:
    """Check if Iran is in daylight saving time (+4:30 vs +3:30)."""
    check = dt if dt else datetime.now(IRAN_TZ)
    return bool(check.dst())
```

**Modified files:**

1. **`backend/app/services/time_slot_service.py`** — `generate_slots()`
   - When creating `start_dt`/`end_dt` from `datetime.combine(current, template_time)`:
     - `current` is a `date` object — combine with the time, set `tzinfo=IRAN_TZ`, then convert to UTC before storing.
   - `create_slot()` — validate that incoming `start_time`/`end_time` are timezone-aware; if naive, assume Iran and convert.

2. **`backend/app/services/time_slot_service.py`** — `list_slots()`
   - Pass-through the `date` filter as-is to the repo (date comparison happens at DB level via `DATE(start_time)`).

3. **`backend/app/services/booking_service.py`** — `cancel_booking()`
   - Use `now_utc()` from the new timezone module instead of inline `datetime.now(timezone.utc)`.
   - `hours_until_slot` calculation compares `slot.start_time` (now properly UTC) with `now_utc()` — correct.

4. **`backend/app/services/booking_service.py`** — `create_booking()`
   - `expires_at` uses `datetime.now(timezone.utc) + timedelta(minutes=10)` — correct already, but use `now_utc()` helper.

5. **`backend/app/main.py`** — `_cancel_expired_pending()`
   - Replace inline `datetime.now(timezone.utc)` with `now_utc()`.

6. **`backend/app/repositories/time_slot_repo.py`** (if needed)
   - Handle timezone-aware date range queries for `get_existing_start_times()`.

### Data Flow

```
User input (Iran local time, e.g., 14:00)
  → API layer (Pydantic schema)
  → Service layer: iran_to_utc(dt)
  → Repository → DB (UTC, DateTime(timezone=True))
  → Service layer: utc_to_iran(dt) for response
  → Response (Iran local time)
```

### Migration
No data migration is needed for existing slots because:
- Existing data was stored as naive->UTC (PostgreSQL default). Since the app is under development (v0.3.1) and the only court data in the DB is from testing/development, the existing slots are few.
- A one-time script can be provided to fix existing data if needed.

### Error Handling
- If a naive datetime is passed to `iran_to_utc()`, assume Iran timezone and convert.
- If a timezone-aware datetime is passed in, validate it's Iran timezone (or convert from any timezone to UTC).
- Raise `HTTPException(400)` for impossible times (e.g., during Iran's DST spring-forward gap).

### Testing
- Test `iran_to_utc()` and `utc_to_iran()` round-trip.
- Test `cancel_booking()` with slot start times that cross the UTC midnight boundary in Iran.
- Test slot generation with dates that cross DST changes (March and September).

---

## 3. Files Changed

| File | Action |
|---|---|
| `backend/requirements.txt` | Add `slowapi>=0.1.9` |
| `backend/app/core/rate_limiter.py` | NEW — slowapi setup |
| `backend/app/core/timezone.py` | NEW — Iran timezone helpers |
| `backend/app/main.py` | Import rate_limiter; replace inline `datetime.now(timezone.utc)` |
| `backend/app/api/v1/auth.py` | Add `@limiter.limit()` decorators |
| `backend/app/services/time_slot_service.py` | Fix timezone in `generate_slots()` and `create_slot()` |
| `backend/app/services/booking_service.py` | Fix timezone in `cancel_booking()`, `create_booking()` |

---

## 4. Implementation Order

1. Add `slowapi` to requirements and create `rate_limiter.py`
2. Add rate limit decorators to auth endpoints and wire into `main.py`
3. Test rate limiting works
4. Create `timezone.py`
5. Fix `time_slot_service.py` — `generate_slots()`, `create_slot()`
6. Fix `booking_service.py` — `cancel_booking()`, `create_booking()`
7. Fix `main.py` — `_cancel_expired_pending()`
8. Test timezone fixes
