from fastapi import APIRouter

from app.db import sqlite as db

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats():
    """Dashboard statistikasi — Telegram bot SQLite bazasidan."""
    telegram_users = await db.fetchval("SELECT COUNT(*) FROM users") or 0
    sold_products = await db.fetchval(
        "SELECT COALESCE(SUM(quantity), 0) FROM order_items"
    ) or 0
    orders_count = await db.fetchval("SELECT COUNT(*) FROM orders") or 0
    revenue = await db.fetchval("SELECT COALESCE(SUM(total), 0) FROM orders") or 0
    active_orders = await db.fetchval(
        """
        SELECT COUNT(*) FROM orders
        WHERE LOWER(status) NOT IN ('delivered', 'yetkazildi', 'topshirildi')
        """
    ) or 0

    return {
        "users": int(telegram_users),
        "telegram_users": int(telegram_users),
        "sold_products": int(sold_products),
        "orders": int(orders_count),
        "revenue": float(revenue),
        "active_orders": int(active_orders),
        "users_change": 0,
        "orders_change": 0,
        "revenue_change": 0,
        "active_orders_change": 0,
    }


@router.get("/recent-orders")
async def get_recent_orders(limit: int = 8):
    rows = await db.fetch(
        """
        SELECT
            o.id,
            o.total,
            o.status,
            COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Noma''lum') AS customer
        FROM orders o
        JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT ?
        """,
        min(limit, 20),
    )
    from app.schemas.order_status import normalize_status

    items = [
        {
            "id": f"MR-{r['id']:04d}",
            "customer": r["customer"],
            "amount": float(r["total"]),
            "status": normalize_status(r["status"]),
        }
        for r in rows
    ]
    return {"items": items}
