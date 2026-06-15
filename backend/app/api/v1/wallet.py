from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.repositories.wallet_repo import WalletRepo
from app.schemas.wallet import (
    WalletBalanceResponse,
    WalletDepositRequest,
    WalletTransactionResponse,
    WalletWithdrawRequest,
)

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/balance", response_model=WalletBalanceResponse, summary="Wallet balance")
async def get_wallet_balance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = WalletRepo(db)
    wallet = await repo.get_or_create(current_user.id)
    return WalletBalanceResponse(balance=float(wallet.balance))


@router.post("/deposit", response_model=WalletBalanceResponse, summary="Deposit to wallet")
async def deposit_to_wallet(
    request: WalletDepositRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="مبلغ باید مثبت باشد")
    repo = WalletRepo(db)
    wallet = await repo.get_or_create(current_user.id)
    wallet = await repo.add_balance(
        wallet, request.amount, request.description or "واریز به کیف پول"
    )
    return WalletBalanceResponse(balance=float(wallet.balance))


@router.post("/withdraw", response_model=WalletBalanceResponse, summary="Withdraw from wallet")
async def withdraw_from_wallet(
    request: WalletWithdrawRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="مبلغ باید مثبت باشد")
    repo = WalletRepo(db)
    wallet = await repo.get_or_create(current_user.id)
    if float(wallet.balance) < request.amount:
        raise HTTPException(status_code=400, detail="موجودی کافی نیست")
    wallet = await repo.deduct_balance(
        wallet, request.amount, request.description or "برداشت از کیف پول"
    )
    return WalletBalanceResponse(balance=float(wallet.balance))


@router.get(
    "/transactions", response_model=list[WalletTransactionResponse], summary="Transaction history"
)
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
