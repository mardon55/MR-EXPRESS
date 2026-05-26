import json
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import sqlite as db

router = APIRouter()


class DiscountBody(BaseModel):
    name: str
    percent: float = Field(..., gt=0, le=100)
    valid_from: str | None = None
    valid_to: str | None = None
    days_of_week: list[int] | None = None
    scope_type: str = "all"
    scope_id: int | None = None
    is_active: bool = True


class DiscountPatch(BaseModel):
    name: str | None = None
    percent: float | None = Field(None, gt=0, le=100)
    valid_from: str | None = None
    valid_to: str | None = None
    days_of_week: list[int] | None = None
    scope_type: str | None = None
    scope_id: int | None = None
    is_active: bool | None = None


def _parse_days(raw: str | None) -> list[int]:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


async def _deactivate_expired():
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    await db.execute(
        """
        UPDATE discounts SET is_active = 0
        WHERE valid_to IS NOT NULL AND valid_to < ? AND is_active = 1
        """,
        now,
    )


def _discount_item(row: dict) -> dict:
    scope_name = None
    if row.get("scope_type") == "category" and row.get("scope_id"):
        cat = row.get("_scope_name")
        scope_name = cat
    elif row.get("scope_type") == "product" and row.get("scope_id"):
        scope_name = row.get("_scope_name")

    return {
        "id": row["id"],
        "name": row["name"],
        "percent": float(row["percent"]),
        "valid_from": row.get("valid_from"),
        "valid_to": row.get("valid_to"),
        "days_of_week": _parse_days(row.get("days_of_week")),
        "scope_type": row.get("scope_type") or "all",
        "scope_id": row.get("scope_id"),
        "scope_name": scope_name,
        "is_active": bool(row.get("is_active", 1)),
        "created_at": row.get("created_at"),
    }


@router.get("")
async def list_discounts():
    await _deactivate_expired()
    rows = await db.fetch(
        """
        SELECT d.*,
            CASE
                WHEN d.scope_type = 'category' THEN (SELECT name FROM categories WHERE id = d.scope_id)
                WHEN d.scope_type = 'product' THEN (SELECT name FROM products WHERE id = d.scope_id)
                ELSE NULL
            END AS _scope_name
        FROM discounts d
        ORDER BY d.id DESC
        """
    )
    return {"items": [_discount_item(r) for r in rows], "total": len(rows)}


@router.post("")
async def create_discount(body: DiscountBody):
    days_json = json.dumps(body.days_of_week) if body.days_of_week else None
    discount_id = await db.execute(
        """
        INSERT INTO discounts (name, percent, valid_from, valid_to, days_of_week, scope_type, scope_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        body.name.strip(),
        body.percent,
        body.valid_from,
        body.valid_to,
        days_json,
        body.scope_type,
        body.scope_id,
        int(body.is_active),
    )
    row = await db.fetchrow("SELECT * FROM discounts WHERE id = ?", discount_id)
    return {"item": _discount_item(row)}


@router.patch("/{discount_id}")
async def patch_discount(discount_id: int, body: DiscountPatch):
    row = await db.fetchrow("SELECT * FROM discounts WHERE id = ?", discount_id)
    if not row:
        raise HTTPException(404, "Chegirma topilmadi")

    fields = []
    params: list = []
    data = body.model_dump(exclude_unset=True)
    if "days_of_week" in data:
        data["days_of_week"] = json.dumps(data["days_of_week"]) if data["days_of_week"] else None
    if "is_active" in data:
        data["is_active"] = int(data["is_active"])

    for key, val in data.items():
        fields.append(f"{key} = ?")
        params.append(val)

    if fields:
        params.append(discount_id)
        await db.execute(
            f"UPDATE discounts SET {', '.join(fields)} WHERE id = ?",
            *params,
        )

    updated = await db.fetchrow("SELECT * FROM discounts WHERE id = ?", discount_id)
    return {"item": _discount_item(updated)}


@router.delete("/{discount_id}")
async def delete_discount(discount_id: int):
    row = await db.fetchrow("SELECT id FROM discounts WHERE id = ?", discount_id)
    if not row:
        raise HTTPException(404, "Chegirma topilmadi")
    await db.execute("DELETE FROM discounts WHERE id = ?", discount_id)
    return {"ok": True}
