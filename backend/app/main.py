from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.auth import router as auth_router
from app.api.v1.courts import router as courts_router
from app.api.v1.time_slots import router as time_slots_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.payments import router as payments_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.core.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
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
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(reviews_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(payments_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "ToopSet API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
