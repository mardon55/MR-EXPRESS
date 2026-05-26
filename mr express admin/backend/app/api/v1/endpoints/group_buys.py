from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import sqlite as db

router = APIRouter()


class GroupBuyBody(BaseModel):
    product_id: int
    required_participants: int = Field(..., ge=2)
    deadline: str | None = None


class GroupBuyPatch(BaseModel):
    required_participants: int | None = Field(None, ge=2)
    deadline: str | None = None
    status: str | None = None


async def _group_buy_item(group_id: int) -> dict | None:
    row = await db.fetchrow(
        """
        SELECT g.*, p.name AS product_name, p.image_url AS product_image
        FROM group_buys g
        JOIN products p ON p.id = g.product_id
        WHERE g.id = ?
        """,
        group_id,
    )
    if not row:
        return None

    participants = await db.fetch(
        """
        SELECT
            gp.id,
            gp.joined_at,
            u.id AS user_id,
            u.telegram_id,
            COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Noma''lum') AS name
        FROM group_buy_participants gp
        JOIN users u ON u.id = gp.user_id
        WHERE gp.group_buy_id = ?
        ORDER BY gp.joined_at DESC
        """,
        group_id,
    )

    required = int(row["required_participants"])
    current = int(row.get("current_participants") or 0)
    progress = min(100, int((current / required) * 100)) if required else 0

    return {
        "id": row["id"],
        "product_id": row["product_id"],
        "product_name": row["product_name"],
        "product_image": row.get("product_image"),
        "required_participants": required,
        "current_participants": current,
        "progress_percent": progress,
        "deadline": row.get("deadline"),
        "status": row.get("status") or "active",
        "participants": participants,
        "created_at": row.get("created_at"),
    }


@router.get("")
async def list_group_buys():
    rows = await db.fetch("SELECT id FROM group_buys ORDER BY id DESC")
    items = []
    for r in rows:
        item = await _group_buy_item(r["id"])
        if item:
            items.append(item)
    return {"items": items, "total": len(items)}


@router.post("")
async def create_group_buy(body: GroupBuyBody):
    product = await db.fetchrow("SELECT id FROM products WHERE id = ?", body.product_id)
    if not product:
        raise HTTPException(400, "Mahsulot topilmadi")

    group_id = await db.execute(
        """
        INSERT INTO group_buys (product_id, required_participants, deadline, status)
        VALUES (?, ?, ?, 'active')
        """,
        body.product_id,
        body.required_participants,
        body.deadline,
    )
    return {"item": await _group_buy_item(group_id)}


@router.patch("/{group_id}")
async def patch_group_buy(group_id: int, body: GroupBuyPatch):
    row = await db.fetchrow("SELECT * FROM group_buys WHERE id = ?", group_id)
    if not row:
        raise HTTPException(404, "Guruhli xarid topilmadi")

    if body.status and body.status not in ("active", "completed", "cancelled"):
        raise HTTPException(400, "Status: active | completed | cancelled")

    fields = []
    params: list = []
    data = body.model_dump(exclude_unset=True)
    for key, val in data.items():
        fields.append(f"{key} = ?")
        params.append(val)

    if fields:
        params.append(group_id)
        await db.execute(
            f"UPDATE group_buys SET {', '.join(fields)} WHERE id = ?",
            *params,
        )

    if body.status == "completed":
        await db.execute(
            "UPDATE group_buys SET current_participants = required_participants WHERE id = ?",
            group_id,
        )

    return {"item": await _group_buy_item(group_id)}


@router.delete("/{group_id}")
async def delete_group_buy(group_id: int):
    row = await db.fetchrow("SELECT id FROM group_buys WHERE id = ?", group_id)
    if not row:
        raise HTTPException(404, "Guruhli xarid topilmadi")
    await db.execute("DELETE FROM group_buys WHERE id = ?", group_id)
    return {"ok": True}
