import asyncio
import logging
import time
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
from app.api.openapi_docs import install_openapi_docs
from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.contact import router as contact_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.favorites import router as favorites_router
from app.api.v1.manager import router as manager_router
from app.api.v1.manager_requests import router as manager_requests_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.payments import router as payments_router
from app.api.v1.penalties import router as penalties_router
from app.api.v1.refunds import router as refunds_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.settings import router as settings_router
from app.api.v1.time_slots import legacy_router as legacy_time_slots_router
from app.api.v1.time_slots import router as time_slots_router
from app.api.v1.time_slots import slot_detail_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.api.v1.vendors import legacy_router as legacy_vendors_router
from app.api.v1.vendors import router as vendors_router
from app.api.v1.wallet import router as wallet_router
from app.core.config import EnvValidationError, settings, validate_env
from app.core.correlation_id import CorrelationIdMiddleware
from app.core.database import async_session_factory, engine
from app.core.exceptions import (
    SecurityHeadersMiddleware,
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
    record_payment_reconciliation_failure,
    record_payment_reconciliation_success,
    refresh_business_metrics,
)
from app.core.profiler import ProfilerMiddleware
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.redis_client import close_redis
from app.core.timezone import now_utc

METRICS_REFRESH_INTERVAL = 120  # seconds
logger = logging.getLogger(__name__)


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
    """Background task: cancel pending bookings whose 12-min payment window expired."""
    while True:
        try:
            async with async_session_factory() as db:
                from app.models.booking import BookingStatus, SettlementStatus
                from app.models.time_slot import SlotStatus
                from app.repositories.booking_repo import BookingRepo
                from app.repositories.time_slot_repo import TimeSlotRepo

                repo = BookingRepo(db)
                slot_repo = TimeSlotRepo(db)
                now = now_utc()
                expired = await repo.list_expired_pending(now)
                for b in expired:
                    slot = await slot_repo.get_by_id(b.slot_id)
                    if slot:
                        if b.replaces_booking_id:
                            old_booking = await repo.get_by_id(b.replaces_booking_id)
                            if (
                                old_booking
                                and old_booking.status == BookingStatus.PENDING_CANCELLATION
                            ):
                                await slot_repo.update(
                                    slot,
                                    {
                                        "is_reserved": True,
                                        "status": SlotStatus.PENDING_CANCELLATION,
                                    },
                                )
                            else:
                                await slot_repo.update(
                                    slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                                )
                        else:
                            await slot_repo.update(
                                slot, {"is_reserved": False, "status": SlotStatus.OPEN}
                            )
                    await repo.update(
                        b,
                        {
                            "status": BookingStatus.EXPIRED,
                            "settlement_status": SettlementStatus.EXCLUDED_DUE_TO_CANCELLATION,
                        },
                    )
                if expired:
                    await db.commit()
                logger.info("pending booking expiry job completed expired=%s", len(expired))
        except Exception:
            logging.exception("_cancel_expired_pending failed")
        await asyncio.sleep(60)


async def _reconcile_zibal_payments_periodically():
    """Finalize or release Zibal payments even when the browser callback is lost."""
    while True:
        started_at = time.monotonic()
        try:
            if settings.payment_gateway == "zibal":
                async with async_session_factory() as db:
                    from app.services.booking_service import reconcile_stale_zibal_payments

                    result = await reconcile_stale_zibal_payments(db)
                    record_payment_reconciliation_success(result)
                    checked = sum(
                        result[key]
                        for key in ("paid", "failed", "pending", "reconciliation_required")
                    )
                    logger.info(
                        "Zibal reconciliation job completed checked=%s paid=%s failed=%s "
                        "pending=%s unresolved=%s cleaned=%s",
                        checked,
                        result["paid"],
                        result["failed"],
                        result["pending"],
                        result["reconciliation_required"],
                        result["cleaned"],
                    )
                    if result["reconciliation_required"]:
                        logger.warning(
                            "Zibal reconciliation left %s transaction(s) unresolved",
                            result["reconciliation_required"],
                        )
        except Exception:
            record_payment_reconciliation_failure()
            logger.exception("_reconcile_zibal_payments_periodically failed")
        elapsed = time.monotonic() - started_at
        await asyncio.sleep(max(1, 60 - elapsed))


async def _expire_replacement_work_periodically():
    """Release expired replacement holds and restore the original reservation."""
    while True:
        try:
            async with async_session_factory() as db:
                from app.services.replacement_service import expire_replacement_work

                result = await expire_replacement_work(db, now_utc())
                if result["expired_requests"] or result["expired_holds"]:
                    await db.commit()
        except Exception:
            import logging

            logging.exception("_expire_replacement_work_periodically failed")
        await asyncio.sleep(60)


async def _update_vendor_min_prices_nightly():
    """Background task: refresh weekly minimum prices in Redis for all vendors every midnight."""
    from datetime import timedelta

    from app.core.timezone import now_iran

    # Initial warmup after a short startup delay to let the DB pool warm up
    await asyncio.sleep(8)
    while True:
        try:
            async with async_session_factory() as db:
                from app.services.cache_service import compute_and_cache_weekly_min_prices

                prices = await compute_and_cache_weekly_min_prices(db)
                logger.info(
                    "Nightly vendor weekly min_price cache updated vendors_count=%s",
                    len(prices),
                )
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("_update_vendor_min_prices_nightly failed")

        # Sleep until next midnight Iran time (00:00:00)
        try:
            now = now_iran()
            next_midnight = (now + timedelta(days=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            sleep_seconds = max(60, (next_midnight - now).total_seconds())
            await asyncio.sleep(sleep_seconds)
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Error computing next midnight for vendor min_prices")
            await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()

    # ── Startup validation (fails hard if misconfigured for production) ──
    try:
        validate_env(settings)
    except EnvValidationError as exc:
        if settings.app_environment.lower() == "production":
            logger.error(str(exc))
            raise
        logger.warning(
            "Local development — skipping strict validation (%s).\n%s",
            str(exc)[:100],
            "Set APP_ENVIRONMENT=production and configure all env vars before deploying.",
        )

    if (
        settings.payment_gateway == "zibal"
        and settings.zibal_callback_url
        and "/payments/zibal/callback" not in settings.zibal_callback_url
    ):
        logger.warning(
            "ZIBAL_CALLBACK_URL does not use the backend callback endpoint; "
            "reconciliation remains the fallback for lost browser callbacks"
        )

    # ── Migration check + auto-apply ───────────────────────────────────
    if settings.auto_migrate:
        import subprocess
        import sys
        from pathlib import Path

        try:
            logger.info("Checking migration revisions (AUTO_MIGRATE=True)…")
            result = subprocess.run(
                [sys.executable, "-m", "scripts.check_revisions", "--strict"],
                cwd=Path(__file__).resolve().parent.parent,
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                logger.error(
                    "Static migration check FAILED:\n%s\n%s",
                    result.stdout,
                    result.stderr,
                )
                raise RuntimeError(
                    "AUTO_MIGRATE: static migration revision check failed. "
                    "Run `make db-check` locally to diagnose."
                )
        except FileNotFoundError:
            logger.warning("scripts.check_revisions not found — skipping")
        except OSError as exc:
            raise RuntimeError("AUTO_MIGRATE: could not run migration check: %s" % exc) from exc

    # ── OpenTelemetry ─────────────────────────────────────────────────
    if settings.otel_enabled:
        from app.core.telemetry import setup_opentelemetry

        setup_opentelemetry()

    # ── Sentry ─────────────────────────────────────────────────────────
    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment="production",
            traces_sample_rate=settings.sentry_traces_sample_rate,
        )

    metrics_task = asyncio.create_task(_refresh_metrics_periodically())
    cancel_task = asyncio.create_task(_cancel_expired_pending())
    payment_reconciliation_task = asyncio.create_task(_reconcile_zibal_payments_periodically())
    replacement_task = asyncio.create_task(_expire_replacement_work_periodically())
    min_price_task = asyncio.create_task(_update_vendor_min_prices_nightly())
    yield
    metrics_task.cancel()
    cancel_task.cancel()
    payment_reconciliation_task.cancel()
    replacement_task.cancel()
    min_price_task.cancel()
    await close_redis()
    await engine.dispose()


app = FastAPI(
    lifespan=lifespan,
    title="ToopSet API",
    description="Online sports venue booking platform — user management, vendors, bookings, and payments",
    version=__version__,
    docs_url="/docs",
    swagger_ui_parameters={"defaultModelsExpandDepth": -1, "docExpansion": "none"},
    contact={"name": "Amirhossein Nasrollahi", "email": "amirhossein.nasrollahi.main@gmail.com"},
    servers=[
        {"url": "http://localhost:8000", "description": "Local development server"},
    ],
    openapi_tags=[
        {"name": "auth", "description": "Register, login, profile & avatar management"},
        {"name": "vendors", "description": "Search, create & manage sports vendors"},
        {"name": "time-slots", "description": "Manage available time slots for each vendor"},
        {"name": "slots", "description": "View details of a specific time slot"},
        {"name": "bookings", "description": "Book, pay & cancel reservations"},
        {"name": "dashboard", "description": "Stats & reports for users, managers & admins"},
        {"name": "reviews", "description": "Submit & manage user reviews"},
        {"name": "uploads", "description": "Upload vendor images"},
        {"name": "users", "description": "User management (admin)"},
        {"name": "payments", "description": "View payment history (admin)"},
        {"name": "wallet", "description": "Wallet & transaction management"},
        {"name": "notifications", "description": "User notification management"},
        {"name": "penalties", "description": "View user penalties"},
        {"name": "contact", "description": "Submit & manage contact messages"},
        {"name": "favorites", "description": "User favorites management"},
        {
            "name": "admin",
            "description": "System management — settings, logs, vendor approval & deletion",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(",") if settings.cors_origins != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(ProfilerMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
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
app.include_router(vendors_router, prefix="/api/v1")
app.include_router(legacy_vendors_router, prefix="/api/v1")
app.include_router(time_slots_router, prefix="/api/v1")
app.include_router(legacy_time_slots_router, prefix="/api/v1")
app.include_router(slot_detail_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")
app.include_router(refunds_router, prefix="/api/v1")
app.include_router(wallet_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(penalties_router, prefix="/api/v1")
app.include_router(contact_router, prefix="/api/v1")
app.include_router(favorites_router, prefix="/api/v1")
app.include_router(manager_router, prefix="/api/v1")
app.include_router(manager_requests_router)
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


install_openapi_docs(app)
