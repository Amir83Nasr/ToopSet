"""Structured JSON logging configuration for ToopSet backend.

Writes JSON-formatted logs to stdout (for Docker) and to /app/logs/app.log
for Logstash / ELK ingestion.

Includes ``request_id`` in every log record when a correlation ID is active.
"""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from pythonjsonlogger.json import JsonFormatter as _JsonFormatter

from app.core.correlation_id import get_request_id

# Path for the file log handler. Defaults to /app/logs (container convention);
# override with LOG_FILE_DIR for hosts that are not structured around /app.
_LOG_DIR = Path(os.getenv("LOG_FILE_DIR", "/app/logs"))
_LOG_FILE = _LOG_DIR / "app.log"
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
_CONFIGURED_ATTR = "_toopset_logging_configured"

# Fields emitted in every JSON log line.
_LOG_FMT = "%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d %(request_id)s"

# Console format: LOG_FORMAT=console gives human-readable colored output
# (local dev); anything else keeps JSON lines (Docker / ELK).
_LOG_FORMAT = os.getenv("LOG_FORMAT", "json").lower()

_LEVEL_COLORS = {
    "DEBUG": "\033[36m",
    "INFO": "\033[32m",
    "WARNING": "\033[33m",
    "ERROR": "\033[31m",
    "CRITICAL": "\033[1;31m",
}
_RESET = "\033[0m"


class _ConsoleFormatter(logging.Formatter):
    """Compact colored single-line format for local development."""

    def format(self, record: logging.LogRecord) -> str:
        color = _LEVEL_COLORS.get(record.levelname, "")
        # Pad like uvicorn: level prefix always 10 columns before message.
        pad = " " * max(1, 9 - len(record.levelname))
        level = f"{color}{record.levelname}{_RESET}:"
        msg = record.getMessage()
        line = f"{level}{pad}{msg}"
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


class _RequestIdFilter(logging.Filter):
    """Injects the current request_id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


class _ExcludeHealthFilter(logging.Filter):
    """Suppress health-check noise from logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        if "/health" in msg and record.levelno < logging.WARNING:
            return False
        return True


def _build_json_handler() -> logging.Handler:
    handler = logging.StreamHandler(sys.stdout)
    if _LOG_FORMAT == "console":
        handler.setFormatter(_ConsoleFormatter())
    else:
        handler.setFormatter(
            _JsonFormatter(
                fmt=_LOG_FMT,
                datefmt="%Y-%m-%dT%H:%M:%S%z",
            )
        )
    handler.addFilter(_RequestIdFilter())
    handler.addFilter(_ExcludeHealthFilter())
    return handler


def _build_file_handler() -> logging.Handler | None:
    """File handler that writes JSON lines for Logstash to pick up."""
    try:
        _LOG_DIR.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(
            _LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
        )
        fmt: logging.Formatter = _JsonFormatter(
            fmt=_LOG_FMT,
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
        handler.setFormatter(fmt)
        handler.addFilter(_RequestIdFilter())
        handler.addFilter(_ExcludeHealthFilter())
        return handler
    except (OSError, PermissionError):
        return None


def setup_logging() -> None:
    """Idempotent logging bootstrap. Call once at app startup."""
    root_logger = logging.getLogger()
    if getattr(root_logger, _CONFIGURED_ATTR, False):
        return

    handlers: list[logging.Handler] = [_build_json_handler()]
    file_handler = _build_file_handler()
    if file_handler:
        handlers.append(file_handler)

    logging.basicConfig(
        level=_LOG_LEVEL,
        handlers=handlers,
        force=True,
    )
    setattr(logging.getLogger(), _CONFIGURED_ATTR, True)

    # Keep uvicorn access logs under control
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
