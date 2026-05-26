from fastapi import APIRouter, HTTPException, Query

from app.db import sqlite as db

router = APIRouter()

SPAM_KEYWORDS = ("spam", "http://", "https://", "reklama", "casino", "bet ")


def _review_item(row: dict) -> dict:
    content = (row.get("content") or "").lower()
    is_spam = any(k in content for k in SPAM_KEYWORDS)
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "product_id": row["product_id"],
        "user_name": row.get("user_name"),
        "product_name": row.get("product_name"),
        "rating": row["rating"],
        "content": row.get("content"),
        "status": row.get("status") or "pending",
        "is_spam_suspect": is_spam,
        "created_at": row.get("created_at"),
    }


@router.get("")
async def list_reviews(
    status: str | None = Query(None, description="pending | approved | rejected"),
    rating: int | None = Query(None, ge=1, le=5),
    q: str | None = None,
):
    conditions = ["1=1"]
    params: list = []
    if status:
        conditions.append("r.status = ?")
        params.append(status)
    if rating:
        conditions.append("r.rating = ?")
        params.append(rating)
    if q and q.strip():
        like = f"%{q.strip()}%"
        conditions.append("(r.content LIKE ? OR p.name LIKE ?)")
        params.extend([like, like])

    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"""
        SELECT
            r.*,
            COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Noma''lum') AS user_name,
            p.name AS product_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN products p ON p.id = r.product_id
        WHERE {where}
        ORDER BY
            CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,
            r.created_at DESC
        """,
        *params,
    )
    items = [_review_item(r) for r in rows]
    return {"items": items, "total": len(items)}


@router.patch("/{review_id}/approve")
async def approve_review(review_id: int):
    row = await db.fetchrow("SELECT id FROM reviews WHERE id = ?", review_id)
    if not row:
        raise HTTPException(404, "Sharh topilmadi")
    await db.execute(
        "UPDATE reviews SET status = 'approved' WHERE id = ?", review_id
    )
    updated = await db.fetchrow(
        """
        SELECT r.*,
            COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Noma''lum') AS user_name,
            p.name AS product_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN products p ON p.id = r.product_id
        WHERE r.id = ?
        """,
        review_id,
    )
    return {"item": _review_item(updated)}


@router.patch("/{review_id}/reject")
async def reject_review(review_id: int):
    row = await db.fetchrow("SELECT id FROM reviews WHERE id = ?", review_id)
    if not row:
        raise HTTPException(404, "Sharh topilmadi")
    await db.execute(
        "UPDATE reviews SET status = 'rejected' WHERE id = ?", review_id
    )
    updated = await db.fetchrow(
        """
        SELECT r.*,
            COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Noma''lum') AS user_name,
            p.name AS product_name
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN products p ON p.id = r.product_id
        WHERE r.id = ?
        """,
        review_id,
    )
    return {"item": _review_item(updated)}


@router.delete("/{review_id}")
async def delete_review(review_id: int):
    row = await db.fetchrow("SELECT id FROM reviews WHERE id = ?", review_id)
    if not row:
        raise HTTPException(404, "Sharh topilmadi")
    await db.execute("DELETE FROM reviews WHERE id = ?", review_id)
    return {"ok": True}
