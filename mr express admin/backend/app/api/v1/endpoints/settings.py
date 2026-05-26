from fastapi import APIRouter
from pydantic import BaseModel

from app.db import sqlite as db

router = APIRouter()


class PaymentSettingsUpdate(BaseModel):
    card_number: str = ""
    card_holder: str = ""
    bank_name: str = ""


@router.get("/payment")
async def get_payment_settings():
    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            card_number TEXT DEFAULT '',
            card_holder TEXT DEFAULT '',
            bank_name TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    await db.execute("INSERT OR IGNORE INTO payment_settings (id) VALUES (1)")
    row = await db.fetchrow(
        "SELECT card_number, card_holder, bank_name FROM payment_settings WHERE id = 1"
    )
    if not row:
        return {"card_number": "", "card_holder": "", "bank_name": ""}
    return {
        "card_number": row["card_number"] or "",
        "card_holder": row["card_holder"] or "",
        "bank_name": row["bank_name"] or "",
    }


@router.put("/payment")
async def update_payment_settings(body: PaymentSettingsUpdate):
    await db.execute(
        """
        UPDATE payment_settings
        SET card_number = ?, card_holder = ?, bank_name = ?, updated_at = datetime('now')
        WHERE id = 1
        """,
        body.card_number.strip(),
        body.card_holder.strip(),
        body.bank_name.strip(),
    )
    return {"ok": True, **body.model_dump()}
