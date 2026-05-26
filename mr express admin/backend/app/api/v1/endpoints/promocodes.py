import re
import secrets
import string

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.db import sqlite as db

router = APIRouter()

CODE_RE = re.compile(r"^[A-Z0-9]{3,32}$")


class PromocodeBody(BaseModel):
    code: str | None = None
    discount_percent: float = Field(..., gt=0, le=100)
    max_uses: int | None = Field(None, ge=1)
    expires_at: str | None = None
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = re.sub(r"[^A-Za-z0-9]", "", value.strip()).upper()
        if not CODE_RE.match(normalized):
            raise ValueError(
                "Kod 3–32 ta lotin harfi yoki raqamdan iborat bo'lishi kerak"
            )
        return normalized


class PromocodePatch(BaseModel):
    discount_percent: float | None = Field(None, gt=0, le=100)
    max_uses: int | None = Field(None, ge=1)
    expires_at: str | None = None
    is_active: bool | None = None


def _generate_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "MR" + "".join(secrets.choice(alphabet) for _ in range(length))


async def _promo_item(row: dict) -> dict:
    uses = await db.fetchval(
        "SELECT COUNT(*) FROM promocode_uses WHERE promocode_id = ?", row["id"]
    )
    max_uses = row.get("max_uses")
    used = int(row.get("used_count") or uses or 0)
    return {
        "id": row["id"],
        "code": row["code"],
        "discount_percent": float(row["discount_percent"]),
        "max_uses": max_uses,
        "used_count": used,
        "expires_at": row.get("expires_at"),
        "is_active": bool(row.get("is_active", 1)),
        "created_at": row.get("created_at"),
        "remaining_uses": (max_uses - used) if max_uses else None,
    }


@router.get("")
async def list_promocodes():
    rows = await db.fetch("SELECT * FROM promocodes ORDER BY id DESC")
    items = []
    for r in rows:
        items.append(await _promo_item(r))
    return {"items": items, "total": len(items)}


async def _insert_promocode(body: PromocodeBody, *, code: str) -> dict:
    existing = await db.fetchrow("SELECT id FROM promocodes WHERE code = ?", code)
    if existing:
        raise HTTPException(400, "Bu kod allaqachon mavjud")

    promo_id = await db.execute(
        """
        INSERT INTO promocodes (code, discount_percent, max_uses, expires_at, is_active)
        VALUES (?, ?, ?, ?, ?)
        """,
        code,
        body.discount_percent,
        body.max_uses,
        body.expires_at,
        int(body.is_active),
    )
    row = await db.fetchrow("SELECT * FROM promocodes WHERE id = ?", promo_id)
    return {"item": await _promo_item(row)}


@router.post("/generate")
async def generate_promocode(body: PromocodeBody):
    """Tasodifiy kod — admin kod yozmasa."""
    code = body.code or _generate_code()
    return await _insert_promocode(body, code=code)


@router.post("")
async def create_promocode(body: PromocodeBody):
    """Admin o'zi yozgan kod bilan yaratish."""
    if not body.code:
        raise HTTPException(400, "Promokod kodi majburiy")
    return await _insert_promocode(body, code=body.code)


@router.patch("/{promo_id}")
async def patch_promocode(promo_id: int, body: PromocodePatch):
    row = await db.fetchrow("SELECT * FROM promocodes WHERE id = ?", promo_id)
    if not row:
        raise HTTPException(404, "Promokod topilmadi")

    fields = []
    params: list = []
    data = body.model_dump(exclude_unset=True)
    if "is_active" in data:
        data["is_active"] = int(data["is_active"])

    for key, val in data.items():
        fields.append(f"{key} = ?")
        params.append(val)

    if fields:
        params.append(promo_id)
        await db.execute(
            f"UPDATE promocodes SET {', '.join(fields)} WHERE id = ?",
            *params,
        )

    updated = await db.fetchrow("SELECT * FROM promocodes WHERE id = ?", promo_id)
    return {"item": await _promo_item(updated)}


@router.delete("/{promo_id}")
async def delete_promocode(promo_id: int):
    row = await db.fetchrow("SELECT id FROM promocodes WHERE id = ?", promo_id)
    if not row:
        raise HTTPException(404, "Promokod topilmadi")
    await db.execute("DELETE FROM promocodes WHERE id = ?", promo_id)
    return {"ok": True}


@router.get("/{promo_id}/stats")
async def promocode_stats(promo_id: int):
    row = await db.fetchrow("SELECT * FROM promocodes WHERE id = ?", promo_id)
    if not row:
        raise HTTPException(404, "Promokod topilmadi")

    uses = await db.fetch(
        """
        SELECT pu.used_at,
            COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Noma''lum') AS user_name,
            u.telegram_id
        FROM promocode_uses pu
        LEFT JOIN users u ON u.id = pu.user_id
        WHERE pu.promocode_id = ?
        ORDER BY pu.used_at DESC
        LIMIT 50
        """,
        promo_id,
    )
    item = await _promo_item(row)
    return {"item": item, "applications": uses}
