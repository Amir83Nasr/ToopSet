from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.courts import router as courts_router
from app.api.v1.time_slots import router as time_slots_router
from app.api.v1.bookings import router as bookings_router
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

app.include_router(auth_router, prefix="/api/v1")
app.include_router(courts_router, prefix="/api/v1")
app.include_router(time_slots_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "ToopSet API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
