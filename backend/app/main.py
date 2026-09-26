from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from hmac import compare_digest
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import router
from .bootstrap import bootstrap_standard_data
from .config import Settings, get_settings
from .database import Base, create_database_engine, create_session_factory
from .engine.adapter import SchedulingEngine
from .errors import ApplicationError
from .jobs import ScheduleJobDispatcher
from .logging import configure_logging
from .repository import ScheduleRunRepository
from .request_context import current_actor

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or get_settings()
    configure_logging(runtime_settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = create_database_engine(runtime_settings.database_url)
        if runtime_settings.database_auto_create:
            Base.metadata.create_all(engine)
        session_factory = create_session_factory(engine)
        dispatcher = ScheduleJobDispatcher(
            session_factory,
            SchedulingEngine(),
            max_workers=runtime_settings.solver_max_concurrent_jobs,
            inline=runtime_settings.run_jobs_inline,
        )
        app.state.settings = runtime_settings
        app.state.database_engine = engine
        app.state.session_factory = session_factory
        app.state.dispatcher = dispatcher

        with session_factory() as session:
            if runtime_settings.bootstrap_standard_data:
                bootstrap_standard_data(session, runtime_settings.standard_data_path)
            interrupted_ids = ScheduleRunRepository(session).recover_interrupted()
        for run_id in interrupted_ids:
            dispatcher.submit(run_id)
        if interrupted_ids:
            logger.warning(
                "Recovered unfinished schedule runs",
                extra={"count": len(interrupted_ids)},
            )

        yield

        dispatcher.shutdown()
        engine.dispose()

    app = FastAPI(
        title=runtime_settings.application_name,
        version="0.1.0",
        openapi_url=(
            None
            if runtime_settings.environment == "production"
            else f"{runtime_settings.api_prefix}/openapi.json"
        ),
        docs_url=(
            None
            if runtime_settings.environment == "production"
            else f"{runtime_settings.api_prefix}/docs"
        ),
        redoc_url=None,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=runtime_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Idempotency-Key", "X-Request-ID"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):  # type: ignore[no-untyped-def]
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        started = perf_counter()

        def finish(response: JSONResponse):
            duration_ms = round((perf_counter() - started) * 1000, 2)
            response.headers["X-Request-ID"] = request_id
            response.headers["Server-Timing"] = f'app;dur={duration_ms}'
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            logger.info(
                "HTTP request completed",
                extra={
                    "request_id": request_id,
                    "actor": getattr(request.state, "actor", None),
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
            return response

        content_length = request.headers.get("content-length")
        try:
            declared_body_size = int(content_length) if content_length else 0
            if declared_body_size < 0:
                raise ValueError
        except ValueError:
            return finish(
                JSONResponse(
                    status_code=400,
                    content={
                        "error": {
                            "code": "INVALID_CONTENT_LENGTH",
                            "message": "Content-Length must be a non-negative integer",
                            "request_id": request_id,
                        }
                    },
                )
            )
        if declared_body_size > runtime_settings.max_request_body_bytes:
            return finish(
                JSONResponse(
                    status_code=413,
                    content={
                        "error": {
                            "code": "REQUEST_TOO_LARGE",
                            "message": "The request body exceeds the configured limit",
                            "request_id": request_id,
                        }
                    },
                )
            )

        actor = "local-operator"
        role = "operator"
        keys_enabled = bool(runtime_settings.operator_api_key or runtime_settings.reader_api_key)
        public_paths = {f"{runtime_settings.api_prefix}/health"}
        if runtime_settings.environment != "production":
            public_paths.update(
                {
                    f"{runtime_settings.api_prefix}/docs",
                    f"{runtime_settings.api_prefix}/openapi.json",
                }
            )
        if keys_enabled and request.method != "OPTIONS" and request.url.path not in public_paths:
            authorization = request.headers.get("Authorization", "")
            supplied = authorization[7:] if authorization.startswith("Bearer ") else ""
            if runtime_settings.operator_api_key and compare_digest(
                supplied, runtime_settings.operator_api_key
            ):
                actor, role = "api-key:operator", "operator"
            elif runtime_settings.reader_api_key and compare_digest(
                supplied, runtime_settings.reader_api_key
            ):
                actor, role = "api-key:reader", "reader"
            else:
                response = JSONResponse(
                    status_code=401,
                    content={
                        "error": {
                            "code": "AUTHENTICATION_REQUIRED",
                            "message": "A valid bearer API key is required",
                            "request_id": request_id,
                        }
                    },
                    headers={"WWW-Authenticate": "Bearer"},
                )
                return finish(response)
            if role == "reader" and request.method not in {"GET", "HEAD"}:
                return finish(
                    JSONResponse(
                        status_code=403,
                        content={
                            "error": {
                                "code": "OPERATOR_ROLE_REQUIRED",
                                "message": "This operation requires the operator role",
                                "request_id": request_id,
                            }
                        },
                    )
                )
        request.state.actor = actor
        actor_token = current_actor.set(actor)
        try:
            response = await call_next(request)
        finally:
            current_actor.reset(actor_token)
        return finish(response)

    @app.exception_handler(ApplicationError)
    async def application_error(request: Request, exc: ApplicationError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": getattr(request.state, "request_id", None),
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "REQUEST_VALIDATION_ERROR",
                    "message": "The request payload is invalid",
                    "request_id": getattr(request.state, "request_id", None),
                    "details": jsonable_encoder(exc.errors()),
                }
            },
        )

    app.include_router(router, prefix=runtime_settings.api_prefix)
    return app


app = create_app()
