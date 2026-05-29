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
        last_max_id: int | None = None
        heartbeat_count = 0
        try:
            yield 'data: {"type":"connected"}\n\n'
            # Initialize last known max order id
            try:
                row = await db.fetchrow("SELECT COALESCE(MAX(id), 0) AS max_id FROM orders")
                last_max_id = int(row["max_id"]) if row else 0
            except Exception:
                last_max_id = 0

            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=3.0)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    # Poll for new orders every 3 seconds
                    try:
                        row = await db.fetchrow(
                            "SELECT COALESCE(MAX(id), 0) AS max_id, COUNT(*) AS total FROM orders"
                        )
                        current_max = int(row["max_id"]) if row else 0
                        if last_max_id is not None and current_max > last_max_id:
                            last_max_id = current_max
                            yield f'data: {{"type":"new_order","max_id":{current_max}}}\n\n'
                        elif last_max_id is None:
                            last_max_id = current_max
                    except Exception:
                        pass

                    heartbeat_count += 1
                    if heartbeat_count % 3 == 0:
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
            COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || COALESCE(' ' || u.last_name, '')), ''), u.username, 'Noma''lum') AS customer_name,
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

    order_ids = [r["id"] for r in rows]
    items_map: dict[int, list[dict]] = {}
    if order_ids:
        placeholders = ",".join("?" * len(order_ids))
        item_rows = await db.fetch(
            f"""
            SELECT
                oi.order_id,
                oi.quantity,
                oi.price AS unit_price,
                oi.selected_variants,
                p.id AS product_id,
                p.name AS product_name,
                p.image_url,
                p.old_price
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id IN ({placeholders})
            ORDER BY oi.order_id, oi.id
            """,
            *order_ids,
        )
        for ir in item_rows:
            oid = ir["order_id"]
            if oid not in items_map:
                items_map[oid] = []
            sv_raw = ir.get("selected_variants")
            sv = json.loads(sv_raw) if sv_raw else None
            items_map[oid].append({
                "product_id": ir["product_id"],
                "product_name": ir["product_name"],
                "image_url": ir["image_url"],
                "quantity": ir["quantity"],
                "unit_price": float(ir["unit_price"]),
                "old_price": float(ir["old_price"]) if ir["old_price"] else None,
                "subtotal": float(ir["unit_price"]) * int(ir["quantity"]),
                "selected_variants": sv,
            })

    items = []
    for r in rows:
        oid = r["id"]
        items.append(
            {
                "id": oid,
                "code": f"MR-{oid:04d}",
                "customer_name": r["customer_name"],
                "telegram_id": r["telegram_id"],
                "total": float(r["total"]),
                "status": normalize_status(r["status"]),
                "address": r["address"],
                "phone": r["phone"],
                "created_at": r["created_at"],
                "items": items_map.get(oid, []),
            }
        )

    return {"items": items, "total": total or 0, "page": page, "limit": limit}


async def _award_delivery_promos_admin(order_id: int, user_id: int) -> None:
    """Yetkazilganda 2 ta promokod beradi va bildirishnoma yuboradi."""
    from datetime import datetime, timedelta
    valid_until = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
    promos = [
        (f"MR{order_id:04d}CHEGIRMA10", "Keyingi buyurtmaga 10% chegirma", "10%", 10, 200_000),
        (f"MR{order_id:04d}KARGO5",     "Kargo uchun 5% chegirma",          "5%",  5, 150_000),
    ]
    for code, title, discount_label, discount_percent, min_order in promos:
        try:
            await db.execute(
                """
                INSERT OR IGNORE INTO promo_codes
                    (user_id, order_id, code, title, discount_label, discount_percent, min_order, valid_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                user_id, order_id, code, title, discount_label, discount_percent, min_order, valid_until,
            )
        except Exception:
            pass
    try:
        await db.execute(
            "INSERT OR IGNORE INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
            user_id,
            f"🚚 Buyurtma MR-{order_id:04d} yetkazildi!",
            "Buyurtmangiz yetkazib berildi! Sizga 2 ta maxsus promokod berildi — 'Promokodlar' bo'limini tekshiring 🎟️",
        )
    except Exception:
        pass


@router.patch("/{order_id}")
async def patch_order(order_id: int, body: OrderPatch):
    if body.status is None:
        raise HTTPException(400, "Yangilash uchun maydon ko'rsatilmagan")

    status = normalize_status(body.status)
    if status not in ORDER_STATUSES:
        raise HTTPException(400, f"Noto'g'ri status: {body.status}")

    row = await db.fetchrow("SELECT id, user_id, status FROM orders WHERE id = ?", order_id)
    if not row:
        raise HTTPException(404, "Buyurtma topilmadi")

    old_status = normalize_status(row.get("status") or "")

    await db.execute("UPDATE orders SET status = ? WHERE id = ?", status, order_id)
    await _broadcast({"type": "status_update", "order_id": order_id, "status": status})

    if status == "delivered" and old_status != "delivered":
        await _award_delivery_promos_admin(order_id, row["user_id"])

    return {"id": order_id, "status": status}


@router.patch("/{order_id}/status")
async def patch_order_status(order_id: int, body: OrderStatusUpdate):
    return await patch_order(order_id, OrderPatch(status=body.status))
