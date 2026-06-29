"""
OpenTelemetry instrumentation for ToopSet backend.

Configurable via settings:
  - ``otel_enabled`` — master switch (default ``False``).
  - ``otel_exporter_otlp_endpoint`` — OTLP gRPC endpoint (default ``localhost:4317``).
  - ``otel_exporter_console`` — also emit spans to the console (dev only).
  - ``otel_sample_rate`` — trace sampling rate (default ``0.1`` = 10 %).

Instruments:
  - FastAPI / Starlette
  - SQLAlchemy
  - Redis (redis-py)
  - HTTPX / aiohttp client

Usage in ``main.py`` lifespane::
    if settings.otel_enabled:
        setup_opentelemetry()
"""

from __future__ import annotations

import logging

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    ConsoleSpanExporter,
    SimpleSpanProcessor,
)

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_resource() -> Resource:
    """Build the OTel Resource describing this service."""
    attrs = {SERVICE_NAME: settings.otel_service_name}
    return Resource.create(attrs)


def _build_provider() -> TracerProvider:
    """Create and configure the SDK TracerProvider."""
    resource = _build_resource()
    provider = TracerProvider(resource=resource)

    # OTLP exporter (production)
    if settings.otel_exporter_otlp_endpoint:
        headers = {}
        if settings.otel_exporter_otlp_headers:
            for pair in settings.otel_exporter_otlp_headers.split(","):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    headers[k.strip()] = v.strip()
        otlp_exporter = OTLPSpanExporter(
            endpoint=settings.otel_exporter_otlp_endpoint,
            headers=headers,
        )
        provider.add_span_processor(
            BatchSpanProcessor(
                otlp_exporter,
                max_export_batch_size=settings.otel_max_export_batch_size,
                max_queue_size=settings.otel_max_queue_size,
            )
        )

    # Console exporter (development)
    if settings.otel_exporter_console:
        provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))

    return provider


def setup_opentelemetry() -> None:
    """Bootstrap OpenTelemetry instrumentation.

    Call once at application startup **after** all imports are resolved.
    Idempotent — safe to call multiple times.
    """
    if not settings.otel_enabled:
        logger.info("OpenTelemetry is disabled (OTEL_ENABLED=False).")
        return

    if trace.get_tracer_provider().__class__.__name__ != "TracerProvider":
        # Already set up by something else (e.g. a test fixture)
        return

    provider = _build_provider()
    trace.set_tracer_provider(provider)
    logger.info("OpenTelemetry initialized: endpoint=%s", settings.otel_exporter_otlp_endpoint)

    _instrument_app()
    _instrument_libraries()


def _instrument_app() -> None:
    """Instrument FastAPI / Starlette."""
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        from app.main import app

        FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())
        logger.debug("FastAPI instrumented for OpenTelemetry")
    except Exception:
        logger.exception("Failed to instrument FastAPI for OpenTelemetry")


def _instrument_libraries() -> None:
    """Instrument SQLAlchemy, Redis, and HTTP client libraries."""
    try:
        if settings.otel_sqlalchemy_enabled:
            from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

            from app.core.database import engine

            SQLAlchemyInstrumentor().instrument(engine=engine.sync_engine)
            logger.debug("SQLAlchemy instrumented for OpenTelemetry")
    except Exception:
        logger.exception("Failed to instrument SQLAlchemy for OpenTelemetry")

    try:
        if settings.otel_redis_enabled:
            from opentelemetry.instrumentation.redis import RedisInstrumentor

            RedisInstrumentor().instrument()
            logger.debug("Redis instrumented for OpenTelemetry")
    except Exception:
        logger.exception("Failed to instrument Redis for OpenTelemetry")

    try:
        if settings.otel_http_client_enabled:
            from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

            HTTPXClientInstrumentor().instrument()
            logger.debug("HTTPX instrumented for OpenTelemetry")
    except Exception:
        logger.exception("Failed to instrument HTTPX for OpenTelemetry")
