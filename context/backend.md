# Backend

**Stack:** Python 3.12 + FastAPI + SQLAlchemy 2.0 async + Alembic + PostgreSQL + Redis

## Directory

```
backend/app/
├── api/v1/       # 18 routers
├── core/         # 12 infrastructure modules
├── models/       # 15 SQLAlchemy models
├── schemas/      # ~15 Pydantic v2 schemas
├── services/     # 9 business logic services
├── repositories/ # 10 data access repos
└── migrations/   # Alembic (8 versions)
```

## Database Models (15)

| Entity            | Table               | Key Fields                                                                             |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------- |
| User              | users               | phone (unique), role (user/manager/admin), token_version, avatar_url                   |
| Court             | courts              | manager_id→User, sport_types (ARRAY), lat/lng, amenities (JSON), is_active, avg_rating |
| CourtImage        | court_images        | court_id→Court, url, order                                                             |
| TimeSlot          | time_slots          | court_id→Court, start_time/end_time, base_price, is_reserved, **version**              |
| Booking           | bookings            | user_id→User, slot_id→TimeSlot (unique), status, price_paid, expires_at                |
| Payment           | payments            | booking_id→Booking (unique), amount, gateway fields, status                            |
| Wallet            | wallets             | user_id→User (unique), balance                                                         |
| WalletTransaction | wallet_transactions | wallet_id→Wallet, amount, type, description                                            |
| Review            | reviews             | user_id→User, court_id→Court, booking_id (unique), rating, comment                     |
| Penalty           | penalties           | user_id→User, booking_id→Booking, amount, reason                                       |
| Favorite          | favorites           | user_id+→User, court_id→Court (unique together)                                        |
| Notification      | notifications       | user_id→User, type, message, is_read                                                   |
| ContactMessage    | contact_messages    | name, email, phone, subject, message                                                   |
| Setting           | settings            | key (unique), value, description                                                       |
| Log               | logs                | user_id→User (nullable), action, details                                               |

## Key Relationships

- User (1) → Court (N), Booking (N), Review (N), Wallet (1)
- Court (1) → TimeSlot (N), Review (N), CourtImage (N) — cascade delete
- TimeSlot (1) ↔ Booking (1) — unique slot_id
- Booking (1) ↔ Payment (1), Review (1) — unique FKs

## Services (9)

| Service          | File                   | Key Methods                                                   |
| ---------------- | ---------------------- | ------------------------------------------------------------- |
| AuthService      | `auth_service.py`      | register, login, refresh, update_profile                      |
| CourtService     | `court_service.py`     | list_courts, get/create/update/delete, toggle_active          |
| TimeSlotService  | `time_slot_service.py` | list_slots, create/update/delete, generate_slots (bulk)       |
| BookingService   | `booking_service.py`   | list_my_bookings, create_booking, pay_booking, cancel_booking |
| PaymentService   | `payment_service.py`   | process_payment (mock success/fraud/timeout)                  |
| ReviewService    | `review_service.py`    | submit, respond, list, report                                 |
| CacheService     | `cache_service.py`     | slot list cache (per court_id+date)                           |
| DashboardService | `dashboard_service.py` | user/admin/manager stats                                      |
| FavoriteService  | `favorite_service.py`  | toggle, list, check                                           |

## Auth Deps (`api/deps.py`)

1. `get_current_user_optional` → User | None
2. `get_current_user` → User (401 if no token)
3. `get_current_manager` → User (403 if user role)
4. `get_current_admin` → User (403 if not admin)

All validate JWT → active check → token version (single-device enforcement).

## Auth Endpoints

| Prefix           | Rate Limit | Notes                            |
| ---------------- | ---------- | -------------------------------- |
| `/auth/register` | 3/min      | Mock SMS: code 123456 to console |
| `/auth/login`    | 5/min      | Bumps `token_version`            |
| `/auth/refresh`  | —          | Validates token version          |
| `/auth/me`       | —          | Current user profile             |

## Key Design Decisions

- **Optimistic concurrency:** `TimeSlot.version` incremented on update; booking requires matching version
- **Token version:** `User.token_version` bumped on login → invalidates prior sessions
- **Cancellation penalties:** 2h cutoff (impossible), 2-24h (50% penalty), 24h+ (free → refund)
- **Payment mock:** `PaymentService.process_payment()` simulates success/fraud/timeout
- **Wallet:** Only refunds, no direct deposit/charge endpoint yet
- **Image upload:** Upload → Redis `temp_upload:{id}` → court creation → move to `CourtImage` rows → delete Redis key
- **Weekday mapping:** Persian (شنبه=0…جمعه=6) → Python (Mon=0…Sun=6): `[5,6,0,1,2,3,4]`
- **Timezone:** UTC storage, Asia/Tehran for user I/O, `core/timezone.py`
- **Cache degrade:** Redis failure → fall back to DB; slot list cached per court_id+date

## Known Technical Debt

- `CourtService.list_courts()` — duplicate count query vs main query
- `BookingService.list_my_bookings()` / `list_completed_bookings()` — identical response loops
- Payment gateway is mock only
