import json
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import sqlite as db
from app.db.sqlite import bump_version

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
    expired = await db.fetch(
        """
        SELECT id, scope_type, scope_id, percent FROM discounts
        WHERE valid_to IS NOT NULL AND valid_to < ? AND is_active = 1
        """,
        now,
    )
    for row in expired:
        await _remove_discount_from_products(row["scope_type"], row["scope_id"], row["id"])
    await db.execute(
        """
        UPDATE discounts SET is_active = 0
        WHERE valid_to IS NOT NULL AND valid_to < ? AND is_active = 1
        """,
        now,
    )


async def _get_product_ids(scope_type: str, scope_id: int | None) -> list[int]:
    if scope_type == "product" and scope_id:
        rows = await db.fetch("SELECT id FROM products WHERE id = ?", scope_id)
    elif scope_type == "category" and scope_id:
        rows = await db.fetch("SELECT id FROM products WHERE category_id = ?", scope_id)
    else:
        rows = await db.fetch("SELECT id FROM products")
    return [r["id"] for r in rows]


async def _apply_discount_to_products(scope_type: str, scope_id: int | None, percent: float):
    product_ids = await _get_product_ids(scope_type, scope_id)
    for pid in product_ids:
        product = await db.fetchrow("SELECT id, price, old_price FROM products WHERE id = ?", pid)
        if not product:
            continue
        price = float(product["price"])
        old_price = product["old_price"]
        if old_price is None:
            discounted = round(price * (1 - percent / 100))
            await db.execute(
                "UPDATE products SET is_discount = 1, old_price = ?, price = ? WHERE id = ?",
                price,
                discounted,
                pid,
            )
        else:
            await db.execute(
                "UPDATE products SET is_discount = 1 WHERE id = ?",
                pid,
            )


async def _remove_discount_from_products(scope_type: str, scope_id: int | None, discount_id: int):
    product_ids = await _get_product_ids(scope_type, scope_id)
    for pid in product_ids:
        still_covered = await db.fetchval(
            """
            SELECT 1 FROM discounts
            WHERE is_active = 1 AND id != ?
            AND (
                scope_type = 'all'
                OR (scope_type = 'product' AND scope_id = ?)
                OR (scope_type = 'category' AND scope_id = (SELECT category_id FROM products WHERE id = ?))
            )
            """,
            discount_id,
            pid,
            pid,
        )
        if not still_covered:
            product = await db.fetchrow("SELECT price, old_price FROM products WHERE id = ?", pid)
            if not product:
                continue
            old_price = product["old_price"]
            if old_price is not None:
                await db.execute(
                    "UPDATE products SET is_discount = 0, price = ?, old_price = NULL WHERE id = ?",
                    float(old_price),
                    pid,
                )
            else:
                await db.execute(
                    "UPDATE products SET is_discount = 0 WHERE id = ?",
                    pid,
                )


def _discount_item(row: dict) -> dict:
    scope_name = None
    if row.get("scope_type") == "category" and row.get("scope_id"):
        scope_name = row.get("_scope_name")
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
    if body.is_active:
        await _apply_discount_to_products(body.scope_type, body.scope_id, body.percent)
    row = await db.fetchrow("SELECT * FROM discounts WHERE id = ?", discount_id)
    await bump_version()
    return {"item": _discount_item(row)}


@router.patch("/{discount_id}")
async def patch_discount(discount_id: int, body: DiscountPatch):
    row = await db.fetchrow("SELECT * FROM discounts WHERE id = ?", discount_id)
    if not row:
        raise HTTPException(404, "Chegirma topilmadi")

    was_active = bool(row["is_active"])
    current_scope_type = row["scope_type"]
    current_scope_id = row["scope_id"]
    current_percent = float(row["percent"])

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
    new_active = bool(updated["is_active"])
    new_scope_type = updated["scope_type"]
    new_scope_id = updated["scope_id"]
    new_percent = float(updated["percent"])

    if not was_active and new_active:
        await _apply_discount_to_products(new_scope_type, new_scope_id, new_percent)
    elif was_active and not new_active:
        await _remove_discount_from_products(current_scope_type, current_scope_id, discount_id)
    elif was_active and new_active and (
        current_scope_type != new_scope_type
        or current_scope_id != new_scope_id
        or current_percent != new_percent
    ):
        await _remove_discount_from_products(current_scope_type, current_scope_id, discount_id)
        await _apply_discount_to_products(new_scope_type, new_scope_id, new_percent)

    await bump_version()
    return {"item": _discount_item(updated)}


@router.delete("/{discount_id}")
async def delete_discount(discount_id: int):
    row = await db.fetchrow("SELECT id, scope_type, scope_id, is_active FROM discounts WHERE id = ?", discount_id)
    if not row:
        raise HTTPException(404, "Chegirma topilmadi")
    if bool(row["is_active"]):
        await _remove_discount_from_products(row["scope_type"], row["scope_id"], discount_id)
    await db.execute("DELETE FROM discounts WHERE id = ?", discount_id)
    await bump_version()
    return {"ok": True}
