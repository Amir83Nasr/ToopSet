from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.repositories.wallet_repo import WalletRepo
from app.schemas.wallet import WalletBalanceResponse, WalletTransactionResponse

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = WalletRepo(db)
    wallet = await repo.get_or_create(current_user.id)
    return WalletBalanceResponse(balance=float(wallet.balance))


@router.get("/transactions", response_model=list[WalletTransactionResponse])
async def get_wallet_transactions(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = WalletRepo(db)
    wallet = await repo.get_or_create(current_user.id)
    transactions = await repo.get_transactions(wallet.id, limit, offset)
    return [
        WalletTransactionResponse(
            id=t.id,
            wallet_id=t.wallet_id,
            amount=float(t.amount),
            type=t.type,
            description=t.description,
            created_at=t.created_at,
        )
        for t in transactions
    ]
