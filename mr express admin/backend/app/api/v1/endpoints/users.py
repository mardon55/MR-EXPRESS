import csv
import io
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.db import sqlite as db

router = APIRouter()


class UserPatch(BaseModel):
    is_blocked: bool | None = None


def _user_item(row: dict, orders_count: int = 0) -> dict:
    name = " ".join(
        p for p in [row.get("first_name"), row.get("last_name")] if p
    ).strip()
    return {
        "id": row["id"],
        "telegram_id": row["telegram_id"],
        "username": row.get("username"),
        "display_name": name or row.get("username") or "Noma'lum",
        "first_name": row.get("first_name"),
        "last_name": row.get("last_name"),
        "phone": row.get("phone"),
        "is_registered": bool(row.get("is_registered")),
        "is_blocked": bool(row.get("is_blocked")),
        "orders_count": orders_count,
        "created_at": row.get("created_at"),
    }


@router.get("")
async def list_users(
    q: str | None = None,
    page: int = 1,
    limit: int = 50,
):
    page = max(1, page)
    limit = min(max(1, limit), 100)
    offset = (page - 1) * limit
    conditions = ["1=1"]
    params: list = []
    if q and q.strip():
        like = f"%{q.strip()}%"
        conditions.append(
            """(
                CAST(u.telegram_id AS TEXT) LIKE ?
                OR u.username LIKE ?
                OR u.first_name LIKE ?
                OR u.last_name LIKE ?
                OR u.phone LIKE ?
            )"""
        )
        params.extend([like, like, like, like, like])

    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"""
        SELECT
            u.*,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
        FROM users u
        WHERE {where}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
        """,
        *params,
        limit,
        offset,
    )
    total = await db.fetchval(
        f"SELECT COUNT(*) FROM users u WHERE {where}",
        *params,
    )
    items = [_user_item(r, int(r.get("orders_count") or 0)) for r in rows]
    return {"items": items, "total": total or 0, "page": page, "limit": limit}


@router.get("/export")
async def export_users_csv():
    rows = await db.fetch(
        """
        SELECT
            u.id,
            u.telegram_id,
            u.username,
            u.first_name,
            u.last_name,
            u.phone,
            u.is_registered,
            u.is_blocked,
            u.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
        FROM users u
        ORDER BY u.id
        """
    )
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "id",
            "telegram_id",
            "username",
            "first_name",
            "last_name",
            "phone",
            "is_registered",
            "is_blocked",
            "orders_count",
            "created_at",
        ]
    )
    for r in rows:
        writer.writerow(
            [
                r["id"],
                r["telegram_id"],
                r.get("username") or "",
                r.get("first_name") or "",
                r.get("last_name") or "",
                r.get("phone") or "",
                int(r.get("is_registered") or 0),
                int(r.get("is_blocked") or 0),
                r.get("orders_count") or 0,
                r.get("created_at") or "",
            ]
        )
    buffer.seek(0)
    filename = f"users_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{user_id}")
async def get_user(user_id: int):
    row = await db.fetchrow("SELECT * FROM users WHERE id = ?", user_id)
    if not row:
        raise HTTPException(404, "Foydalanuvchi topilmadi")

    orders_count = await db.fetchval(
        "SELECT COUNT(*) FROM orders WHERE user_id = ?", user_id
    )
    orders = await db.fetch(
        """
        SELECT id, total, status, created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 20
        """,
        user_id,
    )
    for o in orders:
        o["code"] = f"MR-{o['id']:04d}"
        o["total"] = float(o["total"])

    return {
        "user": _user_item(row, int(orders_count or 0)),
        "orders": orders,
    }


@router.patch("/{user_id}")
async def patch_user(user_id: int, body: UserPatch):
    row = await db.fetchrow("SELECT id FROM users WHERE id = ?", user_id)
    if not row:
        raise HTTPException(404, "Foydalanuvchi topilmadi")

    if body.is_blocked is not None:
        await db.execute(
            "UPDATE users SET is_blocked = ? WHERE id = ?",
            int(body.is_blocked),
            user_id,
        )

    updated = await db.fetchrow("SELECT * FROM users WHERE id = ?", user_id)
    orders_count = await db.fetchval(
        "SELECT COUNT(*) FROM orders WHERE user_id = ?", user_id
    )
    return {"item": _user_item(updated, int(orders_count or 0))}
