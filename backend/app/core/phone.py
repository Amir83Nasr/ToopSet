from __future__ import annotations

import re

from fastapi import HTTPException, status

_PERSIAN_ARABIC_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
_IR_MOBILE_RE = re.compile(r"^09\d{9}$")


def normalize_phone(phone: str) -> str:
    """Normalize digits and validate the canonical 09XXXXXXXXX mobile format."""
    value = phone.translate(_PERSIAN_ARABIC_DIGITS).strip()

    if not _IR_MOBILE_RE.fullmatch(value):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="شماره تماس باید ۱۱ رقمی باشد و با 09 شروع شود",
        )
    return value
