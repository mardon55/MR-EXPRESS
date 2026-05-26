from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.database import close_db, get_db

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
    yield
    await close_db()


app = FastAPI(title="MR Express API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok", "frontend": FRONTEND_DIST.exists()}


def _serve_spa_index():
    index = FRONTEND_DIST / "index.html"
    if not index.exists():
        raise HTTPException(
            503,
            "Frontend build topilmadi. frontend papkada: npm run build",
        )
    return FileResponse(index)


@app.get("/")
async def spa_root():
    return _serve_spa_index()


if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")


@app.get("/{path:path}")
async def spa_fallback(path: str):
    if path.startswith("api"):
        raise HTTPException(404)
    file_path = FRONTEND_DIST / path
    if file_path.is_file():
        return FileResponse(file_path)
    return _serve_spa_index()
