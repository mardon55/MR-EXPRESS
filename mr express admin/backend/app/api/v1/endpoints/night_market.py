from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import sqlite as db

router = APIRouter()


class NightItemBody(BaseModel):
    name: str
    image_url: str = ""
    day_price: int = Field(..., ge=0)
    night_discount_percent: int = Field(30, ge=1, le=99)
    total_stock: int = Field(10, ge=1)
    sold_count: int = Field(0, ge=0)
    is_active: bool = True


class NightItemPatch(BaseModel):
    name: str | None = None
    image_url: str | None = None
    day_price: int | None = Field(None, ge=0)
    night_discount_percent: int | None = Field(None, ge=1, le=99)
    total_stock: int | None = Field(None, ge=1)
    sold_count: int | None = Field(None, ge=0)
    is_active: bool | None = None


async def _ensure_table():
    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS night_market_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image_url TEXT DEFAULT '',
            day_price INTEGER DEFAULT 0,
            night_discount_percent INTEGER DEFAULT 30,
            total_stock INTEGER DEFAULT 10,
            sold_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        )
        """
    )


def _row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "image_url": row["image_url"] or "",
        "day_price": row["day_price"],
        "night_discount_percent": row["night_discount_percent"],
        "total_stock": row["total_stock"],
        "sold_count": row["sold_count"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    }


@router.get("")
async def list_night_market():
    await _ensure_table()
    rows = await db.fetch(
        "SELECT * FROM night_market_items ORDER BY created_at DESC"
    )
    return {"items": [_row_to_dict(r) for r in rows]}


@router.post("")
async def create_night_item(body: NightItemBody):
    await _ensure_table()
    new_id = await db.execute(
        """
        INSERT INTO night_market_items
            (name, image_url, day_price, night_discount_percent, total_stock, sold_count, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        body.name.strip(),
        body.image_url.strip(),
        body.day_price,
        body.night_discount_percent,
        body.total_stock,
        body.sold_count,
        int(body.is_active),
    )
    row = await db.fetchrow(
        "SELECT * FROM night_market_items WHERE id = ?", new_id
    )
    return {"item": _row_to_dict(row) if row else None}


@router.patch("/{item_id}")
async def patch_night_item(item_id: int, body: NightItemPatch):
    await _ensure_table()
    row = await db.fetchrow(
        "SELECT * FROM night_market_items WHERE id = ?", item_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Topilmadi")

    fields, values = [], []
    if body.name is not None:
        fields.append("name = ?")
        values.append(body.name.strip())
    if body.image_url is not None:
        fields.append("image_url = ?")
        values.append(body.image_url.strip())
    if body.day_price is not None:
        fields.append("day_price = ?")
        values.append(body.day_price)
    if body.night_discount_percent is not None:
        fields.append("night_discount_percent = ?")
        values.append(body.night_discount_percent)
    if body.total_stock is not None:
        fields.append("total_stock = ?")
        values.append(body.total_stock)
    if body.sold_count is not None:
        fields.append("sold_count = ?")
        values.append(body.sold_count)
    if body.is_active is not None:
        fields.append("is_active = ?")
        values.append(int(body.is_active))

    if fields:
        values.append(item_id)
        await db.execute(
            f"UPDATE night_market_items SET {', '.join(fields)} WHERE id = ?",
            *values,
        )

    updated = await db.fetchrow(
        "SELECT * FROM night_market_items WHERE id = ?", item_id
    )
    return {"item": _row_to_dict(updated)}


@router.delete("/{item_id}")
async def delete_night_item(item_id: int):
    await _ensure_table()
    row = await db.fetchrow(
        "SELECT id FROM night_market_items WHERE id = ?", item_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Topilmadi")
    await db.execute("DELETE FROM night_market_items WHERE id = ?", item_id)
    return {"ok": True}
