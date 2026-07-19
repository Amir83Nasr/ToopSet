from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def normalize_card_number(card_number: str) -> str:
    return "".join(ch for ch in card_number if ch.isdigit())


def mask_card_number(card_number: str) -> str:
    normalized = normalize_card_number(card_number)
    if len(normalized) < 8:
        return "****"
    return f"{normalized[:4]}-****-****-{normalized[-4:]}"


def card_fingerprint(card_number: str) -> str:
    normalized = normalize_card_number(card_number)
    return hashlib.sha256(f"bank-card:{normalized}".encode()).hexdigest()


def encrypt_card_number(card_number: str) -> str:
    normalized = normalize_card_number(card_number)
    return _fernet().encrypt(normalized.encode()).decode()


def decrypt_card_number(encrypted_card_number: str) -> str:
    """Decrypt a card number only in tightly scoped payout workflows."""
    return _fernet().decrypt(encrypted_card_number.encode()).decode()
