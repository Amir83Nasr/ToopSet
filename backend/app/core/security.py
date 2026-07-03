import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Key rotation support ──────────────────────────────────────────────


def _get_active_keys() -> list[tuple[str, str | None]]:
    """Return [(key, kid)] pairs for token decoding, current key first."""
    keys: list[tuple[str, str | None]] = [(settings.secret_key, "v1")]
    if settings.secret_key_previous:
        keys.append((settings.secret_key_previous, "v0"))
    return keys


def _get_signing_key() -> tuple[str, str | None]:
    """Return (current_key, kid) for signing new tokens."""
    return (settings.secret_key, "v1")


# ── Token hashing ────────────────────────────────────────────────────


def hash_token(token: str) -> str:
    """Return the SHA-256 hex digest of *token*."""
    return hashlib.sha256(token.encode()).hexdigest()


# ── Password utilities ───────────────────────────────────────────────


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT helpers ──────────────────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(UTC)


def _default_access_expiry() -> timedelta:
    return timedelta(minutes=settings.access_token_expire_minutes)


def _default_refresh_expiry() -> timedelta:
    return timedelta(days=settings.refresh_token_expire_days)


def _build_claims(data: dict, expires_delta: timedelta | None, token_type: str) -> dict:
    """Add standard claims (iat, nbf, jti, iss, aud, exp) to the payload."""
    now = _now()
    to_encode = data.copy()
    to_encode.update(
        {
            "iat": now,
            "nbf": now,
            "jti": uuid.uuid4().hex,
            "iss": settings.jwt_issuer,
            "aud": settings.jwt_audience,
            "exp": now + (expires_delta or _default_access_expiry()),
            "type": token_type,
        }
    )
    return to_encode


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    signing_key, kid = _get_signing_key()
    claims = _build_claims(data, expires_delta, "access")
    headers = {"kid": kid} if kid else {}
    return jwt.encode(claims, signing_key, algorithm="HS256", headers=headers)


def create_refresh_token(data: dict) -> str:
    signing_key, kid = _get_signing_key()
    claims = _build_claims(data, _default_refresh_expiry(), "refresh")
    headers = {"kid": kid} if kid else {}
    return jwt.encode(claims, signing_key, algorithm="HS256", headers=headers)


def create_password_reset_token(data: dict) -> str:
    signing_key, kid = _get_signing_key()
    claims = _build_claims(data, timedelta(minutes=10), "password_reset")
    headers = {"kid": kid} if kid else {}
    return jwt.encode(claims, signing_key, algorithm="HS256", headers=headers)


def tokens_for_user(
    user_id: int, role: str, token_version: int, session_id: str | None = None
) -> tuple[str, str]:
    """Create a token pair.

    *session_id* is embedded only in the refresh token. If not provided a new
    UUID is generated (first-time login/register).
    """
    if session_id is None:
        session_id = uuid.uuid4().hex
    access_data = {
        "sub": str(user_id),
        "role": role,
        "ver": token_version,
    }
    refresh_data = {
        "sub": str(user_id),
        "role": role,
        "ver": token_version,
        "sid": session_id,
    }
    access_token = create_access_token(access_data.copy())
    refresh_token = create_refresh_token(refresh_data.copy())
    return access_token, refresh_token


def decode_token(token: str, expected_type: str | None = None) -> dict | None:
    """Decode and validate *token* against all active signing keys.

    Handles clock skew by applying ``clock_skew_seconds`` leeway to the
    ``exp`` claim (python-jose does not natively support ``leeway`` so we
    do it manually).

    Returns the decoded payload on success, ``None`` if the token is
    expired, malformed, or signed by an unknown key.
    """
    active_keys = _get_active_keys()
    leeway = timedelta(seconds=settings.clock_skew_seconds)

    for key, _kid in active_keys:
        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["HS256"],
                issuer=settings.jwt_issuer,
                audience=settings.jwt_audience,
                options={
                    "verify_iat": False,
                    "verify_nbf": False,
                    "verify_exp": True,
                    "leeway": settings.clock_skew_seconds,
                },
            )
        except ExpiredSignatureError:
            continue
        except (JWTClaimsError, JWTError):
            continue

        # ── Manual claim validation ──────────────────────────────────
        now = _now()

        # iat — must be in the past (with leeway)
        iat = payload.get("iat")
        if iat is not None and datetime.fromtimestamp(iat, tz=UTC) > now + leeway:
            continue

        # nbf — must not be used before (with leeway)
        nbf = payload.get("nbf")
        if nbf is not None and datetime.fromtimestamp(nbf, tz=UTC) > now + leeway:
            continue

        if expected_type is not None and payload.get("type") != expected_type:
            continue

        return payload

    return None
