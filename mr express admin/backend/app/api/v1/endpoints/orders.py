import asyncio
import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.db import sqlite as db
from app.schemas.order_status import ORDER_STATUSES, normalize_status, raw_values_for

router = APIRouter()
logger = logging.getLogger(__name__)

_sse_queues: list[asyncio.Queue] = []


async def _broadcast(event: dict) -> None:
    data = json.dumps(event)
    for q in list(_sse_queues):
        try:
            q.put_nowait(data)
        except asyncio.QueueFull:
            pass


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="confirmed | active | arrived | delivered")


class OrderPatch(BaseModel):
    status: str | None = None


@router.get("/events")
async def order_events():
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _sse_queues.append(queue)

    async def generate() -> AsyncIterator[str]:
        try:
            yield 'data: {"type":"connected"}\n\n'
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            try:
                _sse_queues.remove(queue)
            except ValueError:
                pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


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
        raw_vals = raw_values_for(norm)
        placeholders = ",".join("?" * len(raw_vals))
        conditions.append(f"LOWER(o.status) IN ({placeholders})")
        params.extend([v.lower() for v in raw_vals])

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
    await _broadcast({"type": "status_update", "order_id": order_id, "status": status})
    return {"id": order_id, "status": status}


@router.patch("/{order_id}/status")
async def patch_order_status(order_id: int, body: OrderStatusUpdate):
    return await patch_order(order_id, OrderPatch(status=body.status))
