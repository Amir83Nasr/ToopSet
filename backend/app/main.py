import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.auth import router as auth_router
from app.api.v1.courts import router as courts_router
from app.api.v1.time_slots import router as time_slots_router, slot_detail_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.payments import router as payments_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.penalties import router as penalties_router
from app.api.v1.users import router as users_router
from app.api.v1.contact import router as contact_router
from app.api.v1.favorites import router as favorites_router
from app.core.database import async_session_factory, engine


async def _cancel_expired_pending():
    """Background task: cancel pending bookings whose 10-min payment window expired."""
    while True:
        try:
            async with async_session_factory() as db:
                from app.repositories.booking_repo import BookingRepo
                from app.repositories.time_slot_repo import TimeSlotRepo
                from app.models.booking import BookingStatus
                repo = BookingRepo(db)
                slot_repo = TimeSlotRepo(db)
                now = datetime.now(timezone.utc)
                expired = await repo.list_expired_pending(now)
                for b in expired:
                    slot = await slot_repo.get_by_id(b.slot_id)
                    if slot:
                        await slot_repo.update(slot, {'is_reserved': False})
                    await repo.update(b, {'status': BookingStatus.CANCELLED})
        except Exception:
            pass
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_cancel_expired_pending())
    yield
    task.cancel()
    await engine.dispose()


app = FastAPI(title="ToopSet API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/")
async def root():
    return {"message": "ToopSet API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
