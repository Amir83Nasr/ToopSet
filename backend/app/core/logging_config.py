"""Structured JSON logging configuration for ToopSet backend.

Writes JSON-formatted logs to stdout (for Docker) and to /app/logs/app.log
for Logstash / ELK ingestion.
"""

import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import sys

from pythonjsonlogger import jsonlogger

_LOG_DIR = Path("/app/logs")
_LOG_FILE = _LOG_DIR / "app.log"
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()


class _ExcludeHealthFilter(logging.Filter):
    """Suppress health-check noise from logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        if "/health" in msg and record.levelno < logging.WARNING:
            return False
        return True


def _build_json_handler() -> logging.Handler:
    handler = logging.StreamHandler(sys.stdout)
    fmt: logging.Formatter = jsonlogger.JsonFormatter(  # type: ignore[attr-defined]
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(fmt)
    handler.addFilter(_ExcludeHealthFilter())
    return handler


def _build_file_handler() -> logging.Handler | None:
    """File handler that writes JSON lines for Logstash to pick up."""
    try:
        _LOG_DIR.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(
            _LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
        fmt: logging.Formatter = jsonlogger.JsonFormatter(  # type: ignore[attr-defined]
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
        handler.setFormatter(fmt)
        handler.addFilter(_ExcludeHealthFilter())
        return handler
    except (OSError, PermissionError):
        return None  # non‑critical – logs keep going to stdout


def setup_logging() -> None:
    """Idempotent logging bootstrap. Call once at app startup."""
    if logging.getLogger().hasHandlers():
        return  # already configured

    handlers: list[logging.Handler] = [_build_json_handler()]
    file_handler = _build_file_handler()
    if file_handler:
        handlers.append(file_handler)

    logging.basicConfig(
        level=_LOG_LEVEL,
        handlers=handlers,
        force=True,
    )

    # keep uvicorn access logs under control
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
