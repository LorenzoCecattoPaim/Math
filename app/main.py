import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.config import AUTO_CREATE_TABLES, BACKEND_CORS_ORIGINS
from app.exceptions import FreeLimitReachedError
from app.routers import auth, profiles, exercises, attempts, hotmart

if AUTO_CREATE_TABLES:
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProvaLab API",
    description="API para plataforma de exercícios educacionais",
    version="1.0.0"
)

from fastapi.responses import Response

logger = logging.getLogger(__name__)

@app.options("/{path:path}")
async def options_handler(path: str):
    return Response(status_code=200)


@app.middleware("http")
async def auth_audit_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    if request.url.path.startswith("/auth"):
        client_ip = request.client.host if request.client else "unknown"
        logger.info(
            "auth_audit method=%s path=%s status=%s ip=%s duration_ms=%.2f",
            request.method,
            request.url.path,
            response.status_code,
            client_ip,
            elapsed_ms,
        )

    return response


@app.exception_handler(FreeLimitReachedError)
async def free_limit_reached_handler(
    request: Request,
    exc: FreeLimitReachedError,
):
    return JSONResponse(
        status_code=402,
        content={
            "error": "FREE_LIMIT_REACHED",
            "checkout_url": exc.checkout_url,
        },
    )

# Configurar CORS
cors_allow_credentials = "*" not in BACKEND_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=BACKEND_CORS_ORIGINS,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rotas
app.include_router(auth.router)
app.include_router(profiles.router)
app.include_router(exercises.router)
app.include_router(attempts.router)
app.include_router(hotmart.router)

@app.get("/")
def root():
    return {
        "message": "ProvaLab API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "ok"}
