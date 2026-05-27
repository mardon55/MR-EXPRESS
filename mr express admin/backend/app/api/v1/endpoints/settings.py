from fastapi import APIRouter
from pydantic import BaseModel

from app.db import sqlite as db

router = APIRouter()


class PaymentSettingsUpdate(BaseModel):
    card_number: str = ""
    card_holder: str = ""
    bank_name: str = ""


class CargoRateUpdate(BaseModel):
    rate_per_kg: int = 12000


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


# ── Kargo narxi ────────────────────────────────────────────────────────────────

async def _ensure_cargo_table():
    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS cargo_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            rate_per_kg INTEGER DEFAULT 12000,
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    await db.execute("INSERT OR IGNORE INTO cargo_settings (id) VALUES (1)")


@router.get("/cargo-rate")
async def get_cargo_rate():
    await _ensure_cargo_table()
    row = await db.fetchrow("SELECT rate_per_kg FROM cargo_settings WHERE id = 1")
    return {"rate_per_kg": row["rate_per_kg"] if row else 12000}


@router.put("/cargo-rate")
async def update_cargo_rate(body: CargoRateUpdate):
    await _ensure_cargo_table()
    await db.execute(
        "UPDATE cargo_settings SET rate_per_kg = ?, updated_at = datetime('now') WHERE id = 1",
        body.rate_per_kg,
    )
    return {"ok": True, "rate_per_kg": body.rate_per_kg}
