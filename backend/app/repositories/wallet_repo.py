from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wallet import Wallet
from app.models.wallet_transaction import WalletTransaction


class WalletRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self, user_id: int) -> Wallet:
        stmt = select(Wallet).where(Wallet.user_id == user_id)
        result = await self.db.execute(stmt)
        wallet = result.scalar_one_or_none()
        if not wallet:
            wallet = Wallet(user_id=user_id, balance=0)
            self.db.add(wallet)
            await self.db.commit()
            await self.db.refresh(wallet)
        return wallet

    async def add_balance(
        self, wallet: Wallet, amount: float, description: str | None = None
    ) -> Wallet:
        wallet.balance += Decimal(str(amount))
        tx = WalletTransaction(
            wallet_id=wallet.id, amount=amount, type="deposit", description=description
        )
        self.db.add(tx)
        await self.db.commit()
        await self.db.refresh(wallet)
        return wallet

    async def deduct_balance(
        self, wallet: Wallet, amount: float, description: str | None = None
    ) -> Wallet:
        wallet.balance -= Decimal(str(amount))
        tx = WalletTransaction(
            wallet_id=wallet.id, amount=-amount, type="withdrawal", description=description
        )
        self.db.add(tx)
        await self.db.commit()
        await self.db.refresh(wallet)
        return wallet

    async def get_transactions(
        self, wallet_id: int, limit: int = 20, offset: int = 0
    ) -> list[WalletTransaction]:
        stmt = (
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet_id)
            .order_by(WalletTransaction.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
