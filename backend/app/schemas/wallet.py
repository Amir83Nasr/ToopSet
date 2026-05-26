from datetime import datetime
from pydantic import BaseModel


class WalletResponse(BaseModel):
    id: int
    user_id: int
    balance: float
    created_at: datetime
    updated_at: datetime


class WalletTransactionResponse(BaseModel):
    id: int
    wallet_id: int
    amount: float
    type: str
    description: str | None = None
    created_at: datetime


class WalletBalanceResponse(BaseModel):
    balance: float
