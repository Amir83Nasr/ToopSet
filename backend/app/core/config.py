import re

from pydantic_settings import BaseSettings

__all__ = ["Settings", "settings", "validate_env", "EnvValidationError"]

_VALID_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
_SECRET_KEY_MIN_LENGTH = 32


class EnvValidationError(RuntimeError):
    """Raised when a critical environment variable is missing or invalid at startup."""


class Settings(BaseSettings):
    # Database
    postgres_db: str = "toopset"
    postgres_user: str = "toopset"
    postgres_password: str = "toopset_secret"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_ssl: bool = False

    # JWT
    secret_key: str = "change-me-to-a-random-secret-key"
    secret_key_previous: str = ""
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    jwt_issuer: str = "toopset-api"
    jwt_audience: str = "toopset-client"
    clock_skew_seconds: int = 10
    session_cleanup_interval_days: int = 30

    # Connection Pool
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_pool_recycle: int = 1800
    db_pool_timeout: int = 5

    # Payment
    payment_gateway: str = "mock"

    # SMS
    sms_provider: str = "mock"

    # Monitoring
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.2

    # CORS — comma-separated origins, use "*" for development
    cors_origins: str = "*"

    # Logging
    log_level: str = "INFO"

    # Correlation ID
    correlation_id_header: str = "X-Request-ID"
    correlation_id_length: int = 36

    # OpenTelemetry
    otel_enabled: bool = False
    otel_service_name: str = "toopset-api"
    otel_exporter_otlp_endpoint: str = "http://localhost:4317"
    otel_exporter_otlp_headers: str = ""
    otel_exporter_console: bool = False
    otel_sqlalchemy_enabled: bool = True
    otel_redis_enabled: bool = True
    otel_http_client_enabled: bool = True
    otel_sample_rate: float = 0.1
    otel_max_export_batch_size: int = 512
    otel_max_queue_size: int = 2048

    # Request profiling
    profiler_enabled: bool = False
    profiler_slow_request_threshold_ms: float = 500.0
    profiler_log_sql_queries: bool = True
    profiler_max_queries_per_request: int = 50

    # SLO / Error Budget
    slo_availability_target: float = 99.9
    slo_latency_p99_target_ms: float = 500.0
    slo_error_rate_target: float = 1.0

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def redis_url(self) -> str:
        scheme = "rediss" if self.redis_ssl else "redis"
        if self.redis_password:
            return f"{scheme}://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"
        return f"{scheme}://{self.redis_host}:{self.redis_port}/0"


settings = Settings()


# ── Startup validation ─────────────────────────────────────────────────


def validate_env(settings: Settings | None = None) -> None:
    """Validate all critical environment settings at startup.

    Raises :class:`EnvValidationError` (a ``RuntimeError`` subclass) if any
    required setting is missing, insecure, or invalid.  Call this once during
    the application lifespan **before** the server starts accepting traffic.
    """
    if settings is None:
        settings = Settings()  # pragma: no cover — called with module-level settings in practice

    errors: list[str] = []

    # ── SECRET_KEY ──────────────────────────────────────────────────────
    sk = settings.secret_key
    if not sk or sk == "change-me-to-a-random-secret-key" or sk == "change-me":
        errors.append(
            "SECRET_KEY is still set to a default value. "
            "Generate a strong 64+ character random key:\n"
            '  python3 -c "import secrets; print(secrets.token_urlsafe(64))"'
        )
    elif len(sk) < _SECRET_KEY_MIN_LENGTH:
        errors.append(
            f"SECRET_KEY is too short ({len(sk)} chars); "
            f"minimum {_SECRET_KEY_MIN_LENGTH} characters required."
        )

    # ── DATABASE_URL / individual DB settings ─────────────────────────
    if not settings.postgres_host:
        errors.append("POSTGRES_HOST must be set.")
    if not settings.postgres_user:
        errors.append("POSTGRES_USER must be set.")
    if not settings.postgres_password:
        errors.append("POSTGRES_PASSWORD must be set (use a strong password).")
    if not settings.postgres_db:
        errors.append("POSTGRES_DB must be set.")

    # ── REDIS_URL / individual Redis settings ─────────────────────────
    if not settings.redis_host:
        errors.append("REDIS_HOST must be set.")

    # ── CORS_ORIGINS ───────────────────────────────────────────────────
    cors = settings.cors_origins
    if not cors:
        errors.append("CORS_ORIGINS must be set (comma-separated origins).")
    elif cors == "*":
        errors.append(
            "CORS_ORIGINS is set to '*' which is insecure for production. "
            "Set it to a comma-separated list of allowed origins."
        )

    # ── SENTRY_DSN (optional) ──────────────────────────────────────────
    if settings.sentry_dsn:
        _validate_sentry_dsn(settings.sentry_dsn, errors)

    # ── DB_POOL_SIZE ──────────────────────────────────────────────────
    if settings.db_pool_size < 5:
        errors.append(
            f"DB_POOL_SIZE={settings.db_pool_size} is too low for production; "
            f"recommended minimum is 10."
        )

    # ── LOG_LEVEL ─────────────────────────────────────────────────────
    if settings.log_level.upper() not in _VALID_LOG_LEVELS:
        errors.append(
            f"LOG_LEVEL={settings.log_level!r} is invalid. "
            f"Must be one of: {', '.join(sorted(_VALID_LOG_LEVELS))}."
        )

    # ── PRODUCTION-only checks ────────────────────────────────────────
    if not _is_dev_defaults(settings):
        if settings.payment_gateway == "mock":
            errors.append(
                "PAYMENT_GATEWAY is 'mock' in non-development environment. "
                "Set it to your real payment gateway identifier."
            )
        if settings.sms_provider == "mock":
            errors.append(
                "SMS_PROVIDER is 'mock' in non-development environment. "
                "Set it to your real SMS provider identifier."
            )

    if errors:
        raise EnvValidationError(
            "Environment validation failed with {0} error(s):\n{1}".format(
                len(errors), "\n".join(f"  - {e}" for e in errors)
            )
        )


def _validate_sentry_dsn(dsn: str, errors: list[str]) -> None:
    """Validate Sentry DSN format without making network calls."""
    # DSN format: https://key@oXXX.ingest.sentry.io/project_id
    if not re.match(r"^https://[a-f0-9]{32}@", dsn):
        errors.append(
            "SENTRY_DSN format looks invalid. "
            "Expected: https://<key>@<org>.ingest.sentry.io/<project>"
        )


def _is_dev_defaults(s: Settings) -> bool:
    """Heuristic: returns ``True`` if at least one setting is still at its
    obvious development-only default value."""
    dev_signals = [
        s.secret_key in ("change-me-to-a-random-secret-key", "change-me"),
        s.postgres_host in ("localhost", "127.0.0.1"),
        s.sms_provider == "mock",
    ]
    return any(dev_signals)
