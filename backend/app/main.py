import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.exc import IntegrityError, StatementError

from app import __version__
from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.contact import router as contact_router
from app.api.v1.courts import router as courts_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.favorites import router as favorites_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.payments import router as payments_router
from app.api.v1.penalties import router as penalties_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.time_slots import router as time_slots_router
from app.api.v1.time_slots import slot_detail_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.api.v1.wallet import router as wallet_router
from app.core.config import settings
from app.core.database import async_session_factory, engine
from app.core.exceptions import (
    generic_exception_handler,
    http_exception_handler,
    integrity_error_handler,
    statement_error_handler,
    validation_exception_handler,
)
from app.core.health import check_health
from app.core.logging_config import setup_logging
from app.core.metrics import (
    PrometheusMiddleware,
    metrics_response,
    refresh_business_metrics,
)
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.redis_client import close_redis
from app.core.timezone import now_utc

METRICS_REFRESH_INTERVAL = 120  # seconds


async def _refresh_metrics_periodically():
    """Periodically update business gauges from the database."""
    # Initial refresh after a short delay to let the DB pool warm up
    await asyncio.sleep(5)
    while True:
        try:
            await refresh_business_metrics(async_session_factory)
        except Exception:
            import logging

            logging.exception("_refresh_metrics_periodically failed")
        await asyncio.sleep(METRICS_REFRESH_INTERVAL)


async def _cancel_expired_pending():
    """Background task: cancel pending bookings whose 10-min payment window expired."""
    while True:
        try:
            async with async_session_factory() as db:
                from app.models.booking import BookingStatus
                from app.repositories.booking_repo import BookingRepo
                from app.repositories.time_slot_repo import TimeSlotRepo

                repo = BookingRepo(db)
                slot_repo = TimeSlotRepo(db)
                now = now_utc()
                expired = await repo.list_expired_pending(now)
                for b in expired:
                    slot = await slot_repo.get_by_id(b.slot_id)
                    if slot:
                        await slot_repo.update(slot, {"is_reserved": False})
                    await repo.update(b, {"status": BookingStatus.CANCELLED})
        except Exception:
            import logging

            logging.exception("_cancel_expired_pending failed")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=(
                "development"
                if settings.secret_key == "change-me-to-a-random-secret-key"
                else "production"
            ),
            traces_sample_rate=settings.sentry_traces_sample_rate,
        )

    metrics_task = asyncio.create_task(_refresh_metrics_periodically())
    cancel_task = asyncio.create_task(_cancel_expired_pending())
    yield
    metrics_task.cancel()
    cancel_task.cancel()
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title="ToopSet API",
    description="Online sports venue booking platform — user management, courts, bookings, and payments",
    version=__version__,
    docs_url="/docs",
    swagger_ui_parameters={"defaultModelsExpandDepth": -1, "docExpansion": "none"},
    contact={"name": "Amirhossein Nasrollahi", "email": "amirhossein.nasrollahi.main@gmail.com"},
    servers=[
        {"url": "http://localhost:8000", "description": "Local network server"},
        {"url": "http://192.168.1.20:8000", "description": "Mac network server"},
    ],
    openapi_tags=[
        {"name": "auth", "description": "Register, login, profile & avatar management"},
        {"name": "courts", "description": "Search, create & manage sports courts"},
        {"name": "time-slots", "description": "Manage available time slots for each court"},
        {"name": "slots", "description": "View details of a specific time slot"},
        {"name": "bookings", "description": "Book, pay & cancel reservations"},
        {"name": "dashboard", "description": "Stats & reports for users, managers & admins"},
        {"name": "reviews", "description": "Submit & manage user reviews"},
        {"name": "uploads", "description": "Upload court images"},
        {"name": "users", "description": "User management (admin)"},
        {"name": "payments", "description": "View payment history (admin)"},
        {"name": "wallet", "description": "Wallet & transaction management"},
        {"name": "notifications", "description": "User notification management"},
        {"name": "penalties", "description": "View user penalties"},
        {"name": "contact", "description": "Submit & manage contact messages"},
        {"name": "favorites", "description": "User favorites management"},
        {
            "name": "admin",
            "description": "System management — settings, logs, court approval & deletion",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(PrometheusMiddleware)
app.add_middleware(SlowAPIMiddleware)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# ── Global exception handlers ──────────────────────────────────────────
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(StatementError, statement_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

uploads_path = Path("uploads")
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router, prefix="/api/v1")
app.include_router(courts_router, prefix="/api/v1")
app.include_router(time_slots_router, prefix="/api/v1")
app.include_router(slot_detail_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(wallet_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(penalties_router, prefix="/api/v1")
app.include_router(contact_router, prefix="/api/v1")
app.include_router(favorites_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health", summary="Health check")
async def health():
    return await check_health()


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return metrics_response()
