import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes.auth import router as auth_router
from app.routes.jobs import router as jobs_router
from app.services.ffmpeg import check_ffmpeg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
log = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Music Visualizer API",
        description="Generate YouTube-ready music visualizer videos via FFmpeg.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # TODO: restrict to frontend origin in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router)
    app.include_router(jobs_router)

    @app.on_event("startup")
    async def _startup() -> None:
        init_db()
        try:
            check_ffmpeg()
            log.info("FFmpeg check passed.")
        except RuntimeError as exc:
            log.error("STARTUP ERROR: %s", exc)
            # Don't crash the server — let individual requests fail with a clear message

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
