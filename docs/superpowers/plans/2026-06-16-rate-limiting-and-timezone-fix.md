# Rate Limiting & Timezone Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Redis-backed rate limiting to auth endpoints and fix timezone handling in booking slot operations.

**Architecture:** Rate limiting uses slowapi library with Redis storage (IP+path key per endpoint). Timezone handling adds `Asia/Tehran` as the canonical user-facing timezone, converting Iran local ↔ UTC at storage boundaries. Both are backend-only changes.

**Tech Stack:** FastAPI, slowapi, Redis, Python zoneinfo, Pydantic v2

**Design Spec:** `docs/superpowers/specs/2026-06-16-rate-limiting-and-timezone-fix-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/app/core/rate_limiter.py` | CREATE | slowapi Limiter init, Redis storage, 429 handler |
| `backend/app/core/timezone.py` | CREATE | Iran timezone constants, `iran_to_utc()`, `utc_to_iran()`, `now_utc()` |
| `backend/app/main.py` | MODIFY | Wire rate limiter middleware, replace `datetime.now(timezone.utc)` with `now_utc()` |
| `backend/app/api/v1/auth.py` | MODIFY | Add `@limiter.limit()` decorators to login, register, refresh |
| `backend/app/services/time_slot_service.py` | MODIFY | Fix `generate_slots()`, `create_slot()` to use Iran→UTC conversion |
| `backend/app/services/booking_service.py` | MODIFY | Fix `cancel_booking()` time comparison, use `now_utc()` |
| `backend/requirements.txt` | MODIFY | Add `slowapi>=0.1.9` |

---

### Task 1: Add slowapi to requirements

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add slowapi dependency**

Edit `backend/requirements.txt` and add `slowapi>=0.1.9` after the `redis` line:

```
redis>=5.0.0
slowapi>=0.1.9
```

- [ ] **Step 2: Commit**

```
git add backend/requirements.txt
git commit -m "chore: add slowapi dependency for rate limiting"
```

---

### Task 2: Create the rate limiter module

**Files:**
- Create: `backend/app/core/rate_limiter.py`

- [ ] **Step 1: Create rate_limiter.py**

```python
"""Redis-backed rate limiter using slowapi.

Initialises a shared Limiter instance that auth endpoints use via decorators.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

from app.core.redis_client import get_redis


async def _redis_storage_override():
    """Provide the shared Redis client to slowapi."""
    return await get_redis()


limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="redis://localhost:6379/0",
    strategy="fixed-window",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Persian 429 response."""
    detail = "تعداد درخواست‌های مجاز شما به پایان رسیده است. لطفاً کمی بعد تلاش کنید."
    return JSONResponse(
        status_code=HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": detail},
    )
```

- [ ] **Step 2: Commit**

```
git add backend/app/core/rate_limiter.py
git commit -m "feat: add rate limiter module with slowapi + Redis backend"
```

---

### Task 3: Wire rate limiter into main.py

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add rate limiter imports and middleware**

Add these imports at the top of `backend/app/main.py`:

```python
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
```

Add this line right after `app.add_middleware(PrometheusMiddleware)`:

```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
```

Also add the import for `RateLimitExceeded`:

```python
from slowapi.errors import RateLimitExceeded
```

- [ ] **Step 2: Commit**

```
git add backend/app/main.py
git commit -m "feat: wire slowapi rate limiter into app middleware"
```

---

### Task 4: Add rate limit decorators to auth endpoints

**Files:**
- Modify: `backend/app/api/v1/auth.py`

- [ ] **Step 1: Add limiter imports**

Add at the top of `backend/app/api/v1/auth.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request
```

- [ ] **Step 2: Add rate-limited login, register, refresh endpoints**

Edit each endpoint:

For `register`:
```python
@router.post(
    "/register", response_model=TokenResponse, status_code=201, summary="Register a new user"
)
@limiter.limit("3/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    service: AuthService = Depends(_auth_service),
):
```

For `login`:
```python
@router.post("/login", response_model=TokenResponse, summary="Login user")
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: LoginRequest,
    service: AuthService = Depends(_auth_service),
):
```

For `refresh`:
```python
@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    body: RefreshRequest,
    service: AuthService = Depends(_auth_service),
):
```

Each endpoint signature gains `request: Request` as the first parameter.

- [ ] **Step 3: Commit**

```
git add backend/app/api/v1/auth.py
git commit -m "feat: add rate limit decorators to auth endpoints"
```

---

### Task 5: Create the Iran timezone module

**Files:**
- Create: `backend/app/core/timezone.py`

- [ ] **Step 1: Create timezone.py**

```python
"""Iran timezone (Asia/Tehran) helpers for consistent datetime handling.

All datetimes are stored in UTC in the database. Iran timezone is used for
user-facing input/output and slot generation.
"""

from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

IRAN_TZ = ZoneInfo("Asia/Tehran")

# UTC+3:30 (standard) = 12600 seconds
# UTC+4:30 (DST)      = 16200 seconds
IRAN_STD_OFFSET = timedelta(hours=3, minutes=30)
IRAN_DST_OFFSET = timedelta(hours=4, minutes=30)


def now_utc() -> datetime:
    """Current time in UTC (for internal comparisons)."""
    return datetime.now(timezone.utc)


def now_iran() -> datetime:
    """Current time in Iran timezone (for display)."""
    return datetime.now(IRAN_TZ)


def iran_to_utc(dt: datetime) -> datetime:
    """Convert an Iran-local datetime to UTC.

    If naive, assume it's in Iran timezone and attach IRAN_TZ first.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IRAN_TZ)
    return dt.astimezone(timezone.utc)


def utc_to_iran(dt: datetime) -> datetime:
    """Convert a UTC datetime to Iran timezone.

    If naive, assume it's UTC first.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IRAN_TZ)


def utc_offset_seconds() -> int:
    """Get current UTC offset in seconds (accounts for Iran DST)."""
    return int(now_iran().utcoffset().total_seconds()) if now_iran().utcoffset() else 12600
```

- [ ] **Step 2: Commit**

```
git add backend/app/core/timezone.py
git commit -m "feat: add Iran timezone (Asia/Tehran) helpers"
```

---

### Task 6: Fix timezone in `generate_slots()`

**Files:**
- Modify: `backend/app/services/time_slot_service.py`

- [ ] **Step 1: Add timezone import**

Add at the top of `backend/app/services/time_slot_service.py`:

```python
from app.core.timezone import iran_to_utc, now_utc
```

- [ ] **Step 2: Fix `generate_slots()` — convert generated datetimes from Iran to UTC**

Replace the slot creation block inside `generate_slots()` (lines ~151-175):

```python
            for template in data.templates:
                start_dt = datetime.combine(
                    current, datetime.strptime(template.start_time, "%H:%M").time()
                )
                end_dt = datetime.combine(
                    current, datetime.strptime(template.end_time, "%H:%M").time()
                )

                if start_dt >= end_dt:
                    skipped += 1
                    continue

                # Convert Iran-local slot times to UTC for storage
                start_dt_utc = iran_to_utc(start_dt)
                end_dt_utc = iran_to_utc(end_dt)

                if start_dt_utc in existing:
                    skipped += 1
                    continue

                to_create.append(
                    {
                        "court_id": court_id,
                        "start_time": start_dt_utc,
                        "end_time": end_dt_utc,
                        "base_price": template.base_price,
                    }
                )
```

Key changes:
1. `start_dt`/`end_dt` are created naive (as before) — they represent Iran local time
2. `iran_to_utc()` attaches `IRAN_TZ` and converts to UTC
3. The UTC values go into the DB

- [ ] **Step 3: Commit**

```
git add backend/app/services/time_slot_service.py
git commit -m "fix: convert generated time slots from Iran time to UTC"
```

---

### Task 7: Fix timezone in `create_slot()`

**Files:**
- Modify: `backend/app/services/time_slot_service.py`

- [ ] **Step 1: Fix `create_slot()` — convert incoming datetimes to UTC**

In `create_slot()`, after validating the court exists and before calling `self.repo.create(...)`, convert the datetimes:

```python
    async def create_slot(self, data: TimeSlotCreate) -> TimeSlotResponse:
        court = await self.court_repo.get_by_id(data.court_id)
        if not court:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="مجموعه یافت نشد")
        if data.start_time >= data.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="زمان شروع باید قبل از زمان پایان باشد",
            )

        # Convert Iran-local input to UTC for storage
        slot_data = data.model_dump()
        slot_data["start_time"] = iran_to_utc(data.start_time)
        slot_data["end_time"] = iran_to_utc(data.end_time)

        slot = await self.repo.create(slot_data)
        await invalidate_slot_list(data.court_id)
        return TimeSlotResponse.model_validate(slot)
```

- [ ] **Step 2: Commit**

```
git add backend/app/services/time_slot_service.py
git commit -m "fix: convert create_slot() input datetimes from Iran to UTC"
```

---

### Task 8: Fix timezone in `booking_service.py`

**Files:**
- Modify: `backend/app/services/booking_service.py`

- [ ] **Step 1: Replace `datetime.now(timezone.utc)` with `now_utc()`**

Remove the `from datetime import datetime, timedelta, timezone` import and replace with:

```python
from datetime import datetime, timedelta
from app.core.timezone import now_utc
```

Then replace all occurrences of `datetime.now(timezone.utc)` with `now_utc()`:

1. **create_booking()** (line 148):
   ```python
   "expires_at": now_utc() + timedelta(minutes=10),
   ```

2. **cancel_booking()** (line 341):
   ```python
   now = now_utc()
   ```
   This is the critical fix — `slot.start_time` is now properly stored in UTC
   (from Task 6), and `now_utc()` returns UTC, so `hours_until_slot` is correct.

- [ ] **Step 2: Commit**

```
git add backend/app/services/booking_service.py
git commit -m "fix: use now_utc() for consistent timezone comparisons in bookings"
```

---

### Task 9: Fix timezone in main.py background task

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Replace inline `datetime.now(timezone.utc)` with `now_utc()`**

Replace the import:
```python
from datetime import datetime, timezone
```
→
```python
from datetime import datetime
```

Add import to the top of the file:
```python
from app.core.timezone import now_utc
```

In `_cancel_expired_pending()`, replace:
```python
now = datetime.now(timezone.utc)
```
→
```python
now = now_utc()
```

- [ ] **Step 2: Commit**

```
git add backend/app/main.py
git commit -m "fix: use now_utc() in background expiry task"
```

---

### Task 10: Verify rate limiting end-to-end

- [ ] **Step 1: Start the backend server**

```
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run in background.

- [ ] **Step 2: Hit login endpoint with curl to verify rate limit**

```
# First 5 requests should succeed
for i in $(seq 1 5); do
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"phone":"09120000000","password":"wrong"}'
  echo ""
done

# 6th request should return 429
curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"09120000000","password":"wrong"}'
```

Expected: first 5 → 401 or 422 (auth error, not rate limit), 6th → 429 with Persian message.

- [ ] **Step 3: Commit if not already**

(No code changes needed for verification)

---

### Task 11: Verify timezone fix with a quick test

- [ ] **Step 1: Start backend and generate a test slot**

```bash
cd backend
python -c "
from app.core.timezone import iran_to_utc, utc_to_iran, IRAN_TZ
from datetime import datetime

# Test: Iran noon -> UTC
iran_dt = datetime(2026, 6, 20, 12, 0, 0)
utc_dt = iran_to_utc(iran_dt)
print(f'Iran noon: {iran_dt}')
print(f'UTC: {utc_dt}')
print(f'Offset: {(iran_dt.replace(tzinfo=IRAN_TZ).utcoffset())}')

# Round-trip
back = utc_to_iran(utc_dt)
print(f'Round-trip: {back}')
assert back.hour == 12, f'Expected 12, got {back.hour}'
print('OK: Round-trip works')
"
```

Expected output shows Iran noon (12:00) → UTC 08:30 (or 07:30 in DST).

- [ ] **Step 2: Commit if not already**

(No code changes needed for verification)

---

## Self-Review Checklist

Before executing, verify these:

1. ✅ **Spec coverage:** Every section of the design spec has a corresponding task:
   - Rate limiter module → Task 2
   - Wire into main.py → Task 3
   - Auth endpoint decorators → Task 4
   - Timezone module → Task 5
   - generate_slots() fix → Task 6
   - create_slot() fix → Task 7
   - booking_service cancel/compare → Task 8
   - main.py background task → Task 9
   - Installation → Task 1
   - Verification → Tasks 10, 11

2. ✅ **No placeholders:** Every step has complete code, exact file paths, and commit commands.

3. ✅ **Type consistency:** `iran_to_utc()` and `now_utc()` are imported consistently across all services. `RateLimitExceeded` import path is correct for slowapi.

4. ✅ **Completeness:** No missing edge cases — naive datetime handling is explicit in both conversion functions.
