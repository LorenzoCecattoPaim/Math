import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.exceptions import FreeLimitReachedError
from app.routers import auth, profiles, exercises, attempts, hotmart

# Criar tabelas no banco
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
    response = await call_next(request)

    if request.url.path.startswith("/auth"):
        client_ip = request.client.host if request.client else "unknown"
        logger.info(
            "auth_audit method=%s path=%s status=%s ip=%s",
            request.method,
            request.url.path,
            response.status_code,
            client_ip,
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
