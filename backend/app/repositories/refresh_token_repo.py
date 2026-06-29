from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.refresh_token import RefreshToken


class RefreshTokenRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        token_hash: str,
        user_id: int,
        session_id: str,
        expires_at: datetime,
        device_info: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> RefreshToken:
        token = RefreshToken(
            token_hash=token_hash,
            user_id=user_id,
            session_id=session_id,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(token)
        await self.db.flush()
        await self.db.refresh(token)
        return token

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self.db.execute(
            select(RefreshToken)
            .options(joinedload(RefreshToken.user))
            .where(RefreshToken.token_hash == token_hash)
        )
        return result.unique().scalar_one_or_none()

    async def get_active_sessions(
        self, user_id: int, *, now: datetime | None = None
    ) -> list[RefreshToken]:
        """Return the latest token per active (non-revoked, non-expired) session."""
        if now is None:
            now = datetime.now(timezone.utc)
        # Get all non-revoked, non-expired tokens for this user, ordered by issued_at desc
        result = await self.db.execute(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.issued_at.desc())
        )
        tokens = list(result.scalars().all())
        # Deduplicate by session_id — keep the latest one
        seen: set[str] = set()
        active: list[RefreshToken] = []
        for t in tokens:
            if t.session_id not in seen:
                seen.add(t.session_id)
                active.append(t)
        return active

    async def revoke(self, token_id: int) -> None:
        await self.db.execute(
            update(RefreshToken).where(RefreshToken.id == token_id).values(revoked_at=func.now())
        )
        await self.db.flush()

    async def revoke_set(self, token_ids: list[int], *, now: datetime | None = None) -> int:
        """Revoke multiple tokens by ID. Returns count of affected rows."""
        if not token_ids:
            return 0
        result = await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.id.in_(token_ids))
            .values(revoked_at=now or func.now())
        )
        await self.db.flush()
        return result.rowcount  # type: ignore[return-value]

    async def revoke_all_for_user(
        self, user_id: int, *, except_session_id: str | None = None, now: datetime | None = None
    ) -> int:
        """Revoke all active refresh tokens for a user. Returns count."""
        query = (
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now or func.now())
        )
        if except_session_id:
            query = query.where(RefreshToken.session_id != except_session_id)
        result = await self.db.execute(query)
        await self.db.flush()
        return result.rowcount  # type: ignore[return-value]

    async def revoke_all_for_session(
        self, session_id: str, user_id: int | None = None, *, now: datetime | None = None
    ) -> int:
        """Revoke all tokens for a given session. Optionally scoped to a user."""
        query = (
            update(RefreshToken)
            .where(
                RefreshToken.session_id == session_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=now or func.now())
        )
        if user_id is not None:
            query = query.where(RefreshToken.user_id == user_id)
        result = await self.db.execute(query)
        await self.db.flush()
        return result.rowcount  # type: ignore[return-value]

    async def get_chain_for_user(
        self, user_id: int, *, token_hash: str | None = None, now: datetime | None = None
    ) -> list[RefreshToken]:
        """Return the entire token chain for a user, including revoked tokens,
        ordered by issued_at. If token_hash is provided, starts from that node."""
        if now is None:
            now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.expires_at > now,
            )
            .order_by(RefreshToken.issued_at.asc())
        )
        tokens = list(result.scalars().all())
        if token_hash and tokens:
            # Find the starting index
            for i, t in enumerate(tokens):
                if t.token_hash == token_hash:
                    return tokens[i:]
        return tokens

    async def delete_expired(self, before: datetime | None = None) -> int:
        """Delete expired (or revoked-and-expired) tokens. Returns deleted count."""
        if before is None:
            before = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(RefreshToken.id).where(RefreshToken.expires_at <= before)
        )
        ids = [row for row in result.scalars().all()]
        if not ids:
            return 0
        # Delete in batches to avoid excessively large queries
        batch_size = 100
        deleted = 0
        for i in range(0, len(ids), batch_size):
            batch = ids[i : i + batch_size]
            r = await self.db.execute(
                RefreshToken.__table__.delete().where(RefreshToken.id.in_(batch))
            )
            deleted += r.rowcount  # type: ignore[return-value]
        await self.db.flush()
        return deleted

    async def count_active(self, user_id: int) -> int:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(func.count(RefreshToken.id)).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > now,
            )
        )
        return result.scalar_one()
