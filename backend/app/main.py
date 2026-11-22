from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import admin, author, auth, public, registrations, reviewer, speakers
from .seed import seed_defaults


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_defaults(db)
    yield


app = FastAPI(title="RAiSE 2026 Conference Management API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, public.router, author.router, reviewer.router, admin.router,
          registrations.public, registrations.admin, speakers.public, speakers.admin):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok"}
