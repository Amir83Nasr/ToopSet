import re

from pydantic import SecretStr
from pydantic_settings import BaseSettings

__all__ = ["Settings", "settings", "validate_env", "EnvValidationError"]

_VALID_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
_SECRET_KEY_MIN_LENGTH = 32
_SUPPORTED_PAYMENT_GATEWAYS = {"mock", "zibal"}
_SUPPORTED_SMS_PROVIDERS = {"mock", "smsir"}


class EnvValidationError(RuntimeError):
    """Raised when a critical environment variable is missing or invalid at startup."""


class Settings(BaseSettings):
    # Database — set DATABASE_URL (single connection string) for cloud providers
    # like Neon, or set individual POSTGRES_* fields for local dev / Docker.
    DATABASE_URL: str = ""  # direct asyncpg URI (takes priority over POSTGRES_*)
    postgres_db: str = "toopset"
    postgres_user: str = "toopset"
    postgres_password: str = "toopset_secret"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # Redis — set REDIS_URL (single connection string) for cloud providers
    # like Upstash, or set individual REDIS_* fields for local dev / Docker.
    REDIS_URL: str = ""  # direct redis URI (takes priority over REDIS_*)
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
    clock_skew_seconds: int = 30
    session_cleanup_interval_days: int = 30
    app_environment: str = "development"
    bootstrap_admin_secret: str = ""
    allow_audit_log_deletion: bool = False
    auto_migrate: bool = True
    refresh_cookie_name: str = "refresh_token"
    refresh_cookie_secure: bool = False
    refresh_cookie_samesite: str = "lax"

    # Connection Pool
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_pool_recycle: int = 1800
    db_pool_timeout: int = 5

    # Payment
    payment_gateway: str = "mock"
    zibal_merchant: str = ""
    zibal_base_url: str = "https://gateway.zibal.ir"
    zibal_callback_url: str = ""
    payment_result_url: str = "http://localhost:3000/book/payment/callback"

    # SMS
    sms_provider: str = "mock"
    sms_api_url: str = ""
    sms_api_key: SecretStr = SecretStr("")
    sms_template_id: int = 0

    # Monitoring
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.2

    # CORS — comma-separated origins, use "*" for development
    cors_origins: str = "*"

    # ParsPack S3-compatible Object Storage
    parspack_endpoint_url: str = ""
    parspack_public_base_url: str = ""
    parspack_access_key: str = ""
    parspack_secret_key: SecretStr = SecretStr("")
    parspack_bucket_name: str = ""

    @property
    def parspack_configured(self) -> bool:
        """True when S3 access and public URL settings are present."""
        return bool(
            self.parspack_endpoint_url
            and self.parspack_public_base_url
            and self.parspack_access_key
            and self.parspack_secret_key.get_secret_value()
            and self.parspack_bucket_name
        )

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
        """Database connection URL. Uses DATABASE_URL if set, otherwise builds from POSTGRES_*."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            if "+asyncpg" not in url and url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def database_url_sync(self) -> str:
        if self.DATABASE_URL:
            # Strip asyncpg prefix if present, return raw postgresql:// URL
            url = self.DATABASE_URL
            url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
            return url
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def redis_url(self) -> str:
        """Redis connection URL. Uses REDIS_URL if set, otherwise builds from REDIS_*."""
        if self.REDIS_URL:
            return self.REDIS_URL
        scheme = "rediss" if self.redis_ssl else "redis"
        if self.redis_password:
            return f"{scheme}://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"
        return f"{scheme}://{self.redis_host}:{self.redis_port}/0"

    @property
    def is_development_or_bootstrap(self) -> bool:
        return self.app_environment.lower() in {"development", "dev", "test", "bootstrap"}


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
    if settings.DATABASE_URL:
        if not settings.DATABASE_URL.startswith(("postgresql://", "postgresql+asyncpg://")):
            errors.append(
                "DATABASE_URL must start with postgresql:// or postgresql+asyncpg://. "
                f"Got: {settings.DATABASE_URL[:40]}…"
            )
    else:
        if not settings.postgres_host:
            errors.append("POSTGRES_HOST must be set (or set DATABASE_URL).")
        if not settings.postgres_user:
            errors.append("POSTGRES_USER must be set (or set DATABASE_URL).")
        if not settings.postgres_password:
            errors.append("POSTGRES_PASSWORD must be set (or set DATABASE_URL).")
        if not settings.postgres_db:
            errors.append("POSTGRES_DB must be set (or set DATABASE_URL).")

    # ── REDIS_URL / individual Redis settings ─────────────────────────
    if not settings.REDIS_URL and not settings.redis_host:
        errors.append("REDIS_HOST or REDIS_URL must be set.")

    # ── CORS_ORIGINS ───────────────────────────────────────────────────
    cors = settings.cors_origins
    if not cors:
        errors.append("CORS_ORIGINS must be set (comma-separated origins).")

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

    # ── PRODUCTION-only checks (when APP_ENVIRONMENT=production) ──────
    is_production = settings.app_environment.lower() == "production"

    if settings.payment_gateway not in _SUPPORTED_PAYMENT_GATEWAYS:
        errors.append(
            f"PAYMENT_GATEWAY={settings.payment_gateway!r} has no implementation in this build."
        )
    elif settings.payment_gateway == "zibal":
        if not settings.zibal_merchant:
            errors.append("ZIBAL_MERCHANT must be set when PAYMENT_GATEWAY='zibal'.")
        if not settings.zibal_callback_url:
            errors.append("ZIBAL_CALLBACK_URL must be set when PAYMENT_GATEWAY='zibal'.")
        elif "/payments/zibal/callback" not in settings.zibal_callback_url:
            errors.append(
                "ZIBAL_CALLBACK_URL must point to the backend /payments/zibal/callback endpoint."
            )
        if not settings.payment_result_url:
            errors.append("PAYMENT_RESULT_URL must be set when PAYMENT_GATEWAY='zibal'.")
        elif settings.payment_result_url == settings.zibal_callback_url:
            errors.append("PAYMENT_RESULT_URL must be different from ZIBAL_CALLBACK_URL.")
        if not settings.zibal_base_url:
            errors.append("ZIBAL_BASE_URL must be set when PAYMENT_GATEWAY='zibal'.")
    if settings.sms_provider not in _SUPPORTED_SMS_PROVIDERS:
        errors.append(
            f"SMS_PROVIDER={settings.sms_provider!r} has no implementation in this build."
        )
    elif settings.sms_provider == "smsir":
        if not settings.sms_api_url:
            errors.append("SMS_API_URL must be set when SMS_PROVIDER='smsir'.")
        if not settings.sms_api_key.get_secret_value():
            errors.append("SMS_API_KEY must be set when SMS_PROVIDER='smsir'.")
        if settings.sms_template_id <= 0:
            errors.append("SMS_TEMPLATE_ID must be a positive integer when SMS_PROVIDER='smsir'.")

    if is_production:
        if settings.cors_origins == "*":
            errors.append("CORS_ORIGINS cannot be '*' in production when credentials are allowed.")
        if not settings.refresh_cookie_secure:
            errors.append(
                "REFRESH_COOKIE_SECURE must be true in production so refresh tokens are only "
                "sent over HTTPS. Set REFRESH_COOKIE_SECURE=false only for local HTTP development."
            )
        if settings.refresh_cookie_samesite.lower() != "none":
            errors.append(
                "REFRESH_COOKIE_SAMESITE must be 'none' in production for cross-origin auth "
                "(Vercel frontend → Railway backend). Set it to 'none' so the refresh token "
                "cookie is sent on cross-origin POST requests."
            )
        if settings.payment_gateway == "mock":
            errors.append(
                "PAYMENT_GATEWAY is 'mock' in production. "
                "Set it to your real payment gateway identifier."
            )
        if settings.sms_provider == "mock":
            errors.append(
                "SMS_PROVIDER is 'mock' in production. Set it to your real SMS provider identifier."
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
