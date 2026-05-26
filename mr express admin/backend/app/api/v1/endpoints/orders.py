from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import sqlite as db
from app.schemas.order_status import ORDER_STATUSES, normalize_status

router = APIRouter()


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="confirmed | processing | on_the_way | in_uzbekistan | delivering | delivered")


class OrderPatch(BaseModel):
    status: str | None = None


@router.get("")
async def list_orders(
    status: str | None = None,
    page: int = 1,
    limit: int = 50,
):
    page = max(1, page)
    limit = min(max(1, limit), 100)
    offset = (page - 1) * limit

    conditions = ["1=1"]
    params: list = []
    if status:
        norm = normalize_status(status)
        conditions.append("LOWER(o.status) = ? OR o.status = ?")
        params.extend([norm, status])

    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"""
        SELECT
            o.id,
            o.total,
            o.status,
            o.address,
            o.phone,
            o.created_at,
            COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Noma''lum') AS customer_name,
            u.telegram_id
        FROM orders o
        JOIN users u ON u.id = o.user_id
        WHERE {where}
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
        """,
        *params,
        limit,
        offset,
    )
    total = await db.fetchval(
        f"SELECT COUNT(*) FROM orders o WHERE {where}",
        *params,
    )

    items = []
    for r in rows:
        items.append(
            {
                "id": r["id"],
                "code": f"MR-{r['id']:04d}",
                "customer_name": r["customer_name"],
                "telegram_id": r["telegram_id"],
                "total": float(r["total"]),
                "status": normalize_status(r["status"]),
                "address": r["address"],
                "phone": r["phone"],
                "created_at": r["created_at"],
            }
        )

    return {"items": items, "total": total or 0, "page": page, "limit": limit}


@router.patch("/{order_id}")
async def patch_order(order_id: int, body: OrderPatch):
    if body.status is None:
        raise HTTPException(400, "Yangilash uchun maydon ko'rsatilmagan")

    status = normalize_status(body.status)
    if status not in ORDER_STATUSES:
        raise HTTPException(400, f"Noto'g'ri status: {body.status}")

    row = await db.fetchrow("SELECT id FROM orders WHERE id = ?", order_id)
    if not row:
        raise HTTPException(404, "Buyurtma topilmadi")

    await db.execute("UPDATE orders SET status = ? WHERE id = ?", status, order_id)
    return {"id": order_id, "status": status}


@router.patch("/{order_id}/status")
async def patch_order_status(order_id: int, body: OrderStatusUpdate):
    return await patch_order(order_id, OrderPatch(status=body.status))
