from fastapi import APIRouter

from app.db import sqlite as db

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats():
    """Dashboard statistikasi — Telegram bot SQLite bazasidan."""

    sold_products = await db.fetchval(
        "SELECT COALESCE(SUM(quantity), 0) FROM order_items"
    ) or 0

    daily_revenue = await db.fetchval(
        """
        SELECT COALESCE(SUM(total), 0) FROM orders
        WHERE DATE(created_at) = DATE('now', 'localtime')
        """
    ) or 0

    weekly_revenue = await db.fetchval(
        """
        SELECT COALESCE(SUM(total), 0) FROM orders
        WHERE DATE(created_at) >= DATE('now', '-6 days', 'localtime')
        """
    ) or 0

    monthly_revenue = await db.fetchval(
        """
        SELECT COALESCE(SUM(total), 0) FROM orders
        WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
        """
    ) or 0

    return {
        "sold_products": int(sold_products),
        "daily_revenue": float(daily_revenue),
        "weekly_revenue": float(weekly_revenue),
        "monthly_revenue": float(monthly_revenue),
    }


@router.get("/recent-orders")
async def get_recent_orders(limit: int = 8):
    rows = await db.fetch(
        """
        SELECT
            o.id,
            o.total,
            o.status,
            COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || COALESCE(' ' || u.last_name, '')), ''), u.username, 'Noma''lum') AS customer
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
