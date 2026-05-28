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


@router.get("/revenue-chart")
async def get_revenue_chart(days: int = 30):
    """
    Yapon shami (OHLC) grafigi uchun kunlik daromad.
    Har bir shama = bir kun:
      open  = kun boshidagi birinchi buyurtma summasi
      close = kun oxiridagi oxirgi buyurtma summasi
      high  = o'sha kundagi eng katta buyurtma
      low   = o'sha kundagi eng kichik buyurtma
    """
    safe_days = max(1, min(days, 365))

    rows = await db.fetch(
        f"""
        SELECT
            DATE(created_at, 'localtime')                         AS day,
            COALESCE(MAX(total), 0)                               AS high,
            COALESCE(MIN(total), 0)                               AS low,
            COUNT(*)                                               AS orders,
            COALESCE(SUM(total), 0)                               AS total_revenue,
            (SELECT o2.total FROM orders o2
             WHERE DATE(o2.created_at,'localtime') = DATE(o.created_at,'localtime')
             ORDER BY o2.created_at ASC  LIMIT 1)                 AS open,
            (SELECT o3.total FROM orders o3
             WHERE DATE(o3.created_at,'localtime') = DATE(o.created_at,'localtime')
             ORDER BY o3.created_at DESC LIMIT 1)                 AS close
        FROM orders o
        WHERE DATE(created_at, 'localtime') >= DATE('now', '-{safe_days} days', 'localtime')
        GROUP BY day
        ORDER BY day ASC
        """
    )

    return [
        {
            "day":           r["day"],
            "open":          float(r["open"]  or 0),
            "close":         float(r["close"] or 0),
            "high":          float(r["high"]  or 0),
            "low":           float(r["low"]   or 0),
            "orders":        int(r["orders"]),
            "total_revenue": float(r["total_revenue"] or 0),
        }
        for r in rows
    ]


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
