import asyncio
import json
import logging
import os
import shutil
import uuid
import aiosqlite
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import APIRouter, Header, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.database import execute, fetch, fetchrow, fetchval, get_db, get_or_create_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

# ─── Real-time SSE ─────────────────────────────────────────────────────────────
_sse_queues: list[asyncio.Queue] = []


async def _sse_broadcast(event: dict) -> None:
    data = json.dumps(event)
    for q in list(_sse_queues):
        try:
            q.put_nowait(data)
        except asyncio.QueueFull:
            pass


async def _poll_version_loop() -> None:
    """DB version o'zgarganda barcha SSE clientlarga xabar yuboradi."""
    current_ver = 0
    while True:
        await asyncio.sleep(2)
        try:
            row = await fetchrow("SELECT version FROM _app_version WHERE id = 1")
            new_ver = row["version"] if row else 0
            if new_ver != current_ver:
                current_ver = new_ver
                await _sse_broadcast({"type": "refresh", "version": new_ver})
        except Exception:
            pass


@router.get("/events")
async def mini_app_sse_events():
    """Mini app real-time SSE — admin o'zgartirsa avtomatik yangilanadi."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=20)
    _sse_queues.append(queue)

    async def generate() -> AsyncIterator[str]:
        try:
            yield 'data: {"type":"connected"}\n\n'
            heartbeat = 0
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"data: {data}\n\n"
                    heartbeat = 0
                except asyncio.TimeoutError:
                    heartbeat += 1
                    if heartbeat >= 2:
                        yield ": heartbeat\n\n"
                        heartbeat = 0
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
# ──────────────────────────────────────────────────────────────────────────────

ORDER_STATUS_ACTIVE = "Aktiv"
ORDER_STATUS_PENDING = "pending"
# Absolyut yo'l — qaysi papkadan ishga tushirilganidan qat'iy nazar
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "stories"
REVIEW_PHOTOS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "reviews"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}


def _user_id_header(x_telegram_user_id: str | None) -> int:
    if not x_telegram_user_id:
        raise HTTPException(401, "Telegram user ID required")
    try:
        return int(x_telegram_user_id)
    except ValueError:
        raise HTTPException(400, "Invalid user ID")


async def _db_user_id(telegram_id: int) -> int:
    return await get_or_create_user(telegram_id, None, None, None)


def _product_row(r) -> dict:
    import json as _json
    attrs = None
    if r.get("attributes"):
        try:
            attrs = _json.loads(r["attributes"])
        except Exception:
            attrs = None
    return {
        "id": r["id"],
        "category_id": r["category_id"],
        "name": r["name"],
        "description": r["description"],
        "price": float(r["price"]),
        "old_price": float(r["old_price"]) if r["old_price"] else None,
        "image_url": r["image_url"],
        "stock": r["stock"],
        "is_featured": bool(r["is_featured"]),
        "is_discount": bool(r["is_discount"]),
        "attributes": attrs,
    }


class CartUpdate(BaseModel):
    product_id: int
    quantity: int


class OrderCreate(BaseModel):
    address: str = ""
    phone: str = ""


class ProfileUpdate(BaseModel):
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class RegisterBody(BaseModel):
    first_name: str
    last_name: str
    phone: str


def _user_public(user: dict, orders_count: int | None = None) -> dict:
    data = {
        "id": user["id"],
        "telegram_id": user["telegram_id"],
        "username": user["username"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "phone": user["phone"],
        "is_registered": bool(user.get("is_registered")),
    }
    if orders_count is not None:
        data["orders_count"] = orders_count
    return data


def _normalize_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) < 9:
        raise HTTPException(400, "Telefon raqam noto'g'ri")
    if digits.startswith("998"):
        return f"+{digits}"
    if len(digits) == 9:
        return f"+998{digits}"
    return f"+{digits}" if phone.strip().startswith("+") else f"+{digits}"


@router.post("/auth")
async def auth(
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
    x_telegram_username: str | None = Header(None, alias="X-Telegram-Username"),
    x_telegram_first_name: str | None = Header(None, alias="X-Telegram-First-Name"),
    x_telegram_last_name: str | None = Header(None, alias="X-Telegram-Last-Name"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await get_or_create_user(tid, x_telegram_username, x_telegram_first_name, x_telegram_last_name)
    user = await fetchrow("SELECT * FROM users WHERE id = ?", uid)
    return _user_public(user)


@router.post("/register")
async def register(
    body: RegisterBody,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
    x_telegram_username: str | None = Header(None, alias="X-Telegram-Username"),
    x_telegram_first_name: str | None = Header(None, alias="X-Telegram-First-Name"),
    x_telegram_last_name: str | None = Header(None, alias="X-Telegram-Last-Name"),
):
    tid = _user_id_header(x_telegram_user_id)
    first_name = body.first_name.strip()
    last_name = body.last_name.strip()
    if len(first_name) < 2:
        raise HTTPException(400, "Ism kamida 2 ta belgidan iborat bo'lishi kerak")
    if len(last_name) < 2:
        raise HTTPException(400, "Familiya kamida 2 ta belgidan iborat bo'lishi kerak")
    phone = _normalize_phone(body.phone)

    uid = await get_or_create_user(tid, x_telegram_username, x_telegram_first_name, x_telegram_last_name)
    user = await fetchrow("SELECT * FROM users WHERE id = ?", uid)
    if user.get("is_registered"):
        raise HTTPException(400, "Siz allaqachon ro'yxatdan o'tgansiz")

    await execute(
        """
        UPDATE users SET
            first_name = ?,
            last_name = ?,
            phone = ?,
            is_registered = 1
        WHERE id = ?
        """,
        first_name,
        last_name,
        phone,
        uid,
    )
    user = await fetchrow("SELECT * FROM users WHERE id = ?", uid)
    return _user_public(user)


@router.post("/login")
async def login(
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
    x_telegram_username: str | None = Header(None, alias="X-Telegram-Username"),
    x_telegram_first_name: str | None = Header(None, alias="X-Telegram-First-Name"),
    x_telegram_last_name: str | None = Header(None, alias="X-Telegram-Last-Name"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await get_or_create_user(tid, x_telegram_username, x_telegram_first_name, x_telegram_last_name)
    user = await fetchrow("SELECT * FROM users WHERE id = ?", uid)
    if not user.get("is_registered"):
        raise HTTPException(403, "Avval ro'yxatdan o'ting")
    return _user_public(user)


@router.get("/banners")
async def banners():
    rows = await fetch(
        "SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order"
    )
    return rows


@router.get("/categories")
async def categories():
    return await fetch(
        "SELECT id, name, slug, icon, sort_order, parent_id, image_url FROM categories ORDER BY COALESCE(parent_id, id), sort_order"
    )


@router.get("/products")
async def products(
    q: str | None = Query(None),
    category_id: int | None = Query(None),
    discount_only: bool = Query(False),
    featured_only: bool = Query(False),
    limit: int = Query(10000),
    offset: int = Query(0),
):
    conditions = ["1=1"]
    params: list[Any] = []

    if q:
        conditions.append("(name LIKE ? OR description LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    if category_id:
        child_rows = await fetch(
            "SELECT id FROM categories WHERE parent_id = ?", category_id
        )
        child_ids = [r["id"] for r in child_rows]
        all_ids = [category_id] + child_ids
        placeholders = ",".join("?" * len(all_ids))
        conditions.append(f"category_id IN ({placeholders})")
        params.extend(all_ids)
    if discount_only:
        conditions.append("is_discount = 1")
    else:
        conditions.append("is_discount = 0")
    if featured_only:
        conditions.append("is_featured = 1")

    where = " AND ".join(conditions)
    params.extend([limit, offset])
    rows = await fetch(
        f"SELECT * FROM products WHERE {where} ORDER BY id DESC LIMIT ? OFFSET ?",
        *params,
    )
    return [_product_row(r) for r in rows]


@router.get("/products/{product_id}")
async def product_detail(product_id: int):
    row = await fetchrow("SELECT * FROM products WHERE id = ?", product_id)
    if not row:
        raise HTTPException(404, "Product not found")
    result = _product_row(row)
    imgs = await fetch(
        "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order",
        product_id,
    )
    result["images"] = [i["image_url"] for i in imgs] if imgs else (
        [row["image_url"]] if row.get("image_url") else []
    )
    return result


def _reel_public(row) -> dict:
    price = float(row["price"]) if row.get("price") is not None else float(row["product_price"] or 0)
    return {
        "id": row["id"],
        "video_url": row["video_url"],
        "price": price,
        "product": {
            "id": row["product_id"],
            "name": row.get("product_name") or "",
            "description": row.get("product_description") or "",
            "image_url": row.get("product_image_url"),
            "price": float(row["product_price"]) if row.get("product_price") is not None else price,
        },
    }


@router.get("/reels")
async def list_reels():
    rows = await fetch(
        """
        SELECT r.id, r.video_url, r.price, r.product_id,
               p.name AS product_name, p.description AS product_description,
               p.image_url AS product_image_url, p.price AS product_price
        FROM reels r
        LEFT JOIN products p ON p.id = r.product_id
        WHERE r.is_active = 1
        ORDER BY r.sort_order, r.id DESC
        """
    )
    return [_reel_public(r) for r in rows]


@router.get("/cart")
async def get_cart(x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id")):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    rows = await fetch(
        """
        SELECT c.id AS cart_id, c.quantity,
               p.id, p.category_id, p.name, p.description, p.price, p.old_price,
               p.image_url, p.stock, p.is_featured, p.is_discount
        FROM cart_items c
        JOIN products p ON p.id = c.product_id
        WHERE c.user_id = ?
        """,
        uid,
    )
    items = []
    total = Decimal("0")
    for r in rows:
        price = Decimal(str(r["price"]))
        qty = r["quantity"]
        subtotal = price * qty
        total += subtotal
        items.append({
            "cart_id": r["cart_id"],
            "quantity": qty,
            "subtotal": float(subtotal),
            "product": _product_row(r),
        })
    return {"items": items, "total": float(total), "count": sum(i["quantity"] for i in items)}


@router.post("/cart")
async def update_cart(
    body: CartUpdate,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    if body.quantity <= 0:
        await execute(
            "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
            uid,
            body.product_id,
        )
    else:
        await execute(
            """
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = excluded.quantity
            """,
            uid,
            body.product_id,
            body.quantity,
        )
    return {"ok": True}


@router.get("/favorites")
async def get_favorites(x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id")):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    rows = await fetch(
        """
        SELECT p.* FROM favorites f
        JOIN products p ON p.id = f.product_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
        """,
        uid,
    )
    return [_product_row(r) for r in rows]


@router.post("/favorites/{product_id}")
async def toggle_favorite(
    product_id: int,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    exists = await fetchval(
        "SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?",
        uid,
        product_id,
    )
    if exists:
        await execute(
            "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
            uid,
            product_id,
        )
        return {"favorited": False}
    await execute(
        "INSERT INTO favorites (user_id, product_id) VALUES (?, ?)",
        uid,
        product_id,
    )
    return {"favorited": True}


@router.get("/favorites/ids")
async def favorite_ids(x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id")):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    rows = await fetch(
        "SELECT product_id FROM favorites WHERE user_id = ?",
        uid,
    )
    return [r["product_id"] for r in rows]


@router.get("/profile")
async def profile(x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id")):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    user = await fetchrow("SELECT * FROM users WHERE id = ?", uid)
    orders_count = await fetchval(
        "SELECT COUNT(*) FROM orders WHERE user_id = ?",
        uid,
    )
    return _user_public(user, orders_count)


@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    await execute(
        """
        UPDATE users SET
            phone = COALESCE(?, phone),
            first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name)
        WHERE id = ?
        """,
        body.phone,
        body.first_name,
        body.last_name,
        uid,
    )
    return await profile(x_telegram_user_id)


@router.get("/notifications")
async def get_notifications(x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id")):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    rows = await fetch(
        "SELECT id, title, message, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC",
        uid
    )
    return rows


@router.get("/orders")
async def list_orders(
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    rows = await fetch(
        """
        SELECT o.id, o.total, o.status, o.address, o.phone, o.created_at,
               COUNT(oi.id) AS item_count
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.id DESC
        """,
        uid,
    )
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "code": f"MR-{r['id']:04d}",
            "total": float(r["total"]),
            "status": r["status"] or ORDER_STATUS_PENDING,
            "address": r["address"] or "",
            "phone": r["phone"] or "",
            "item_count": r["item_count"] or 0,
            "created_at": r["created_at"],
        })
    return result


@router.get("/orders/events")
async def order_events_stream(
    tid: str | None = Query(default=None),
    x_telegram_user_id: str | None = Header(default=None, alias="X-Telegram-User-Id"),
):
    raw_id = tid or x_telegram_user_id
    if not raw_id:
        raise HTTPException(401, "Telegram user ID required")
    user_tid = _user_id_header(raw_id)
    uid = await _db_user_id(user_tid)

    async def generate() -> AsyncIterator[str]:
        last_states: dict[int, str] = {}
        rows = await fetch(
            "SELECT id, status FROM orders WHERE user_id = ?",
            uid,
        )
        for r in rows:
            last_states[r["id"]] = r["status"] or ""
        yield f"data: {json.dumps({'type': 'connected'})}\n\n"
        while True:
            await asyncio.sleep(4)
            try:
                rows = await fetch(
                    "SELECT id, status FROM orders WHERE user_id = ?",
                    uid,
                )
                changes = []
                for r in rows:
                    new_status = r["status"] or ""
                    if last_states.get(r["id"]) != new_status:
                        last_states[r["id"]] = new_status
                        changes.append({"id": r["id"], "status": new_status})
                if changes:
                    yield f"data: {json.dumps({'type': 'status_update', 'orders': changes})}\n\n"
                else:
                    yield ": heartbeat\n\n"
            except Exception:
                yield ": error\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/orders")
async def create_order(
    body: OrderCreate,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    cart = await fetch(
        """
        SELECT c.quantity, p.id, p.price, p.stock, p.name
        FROM cart_items c
        JOIN products p ON p.id = c.product_id
        WHERE c.user_id = ?
        """,
        uid,
    )
    if not cart:
        raise HTTPException(400, "Savatcha bo'sh")

    total = Decimal("0")
    for item in cart:
        if item["quantity"] > item["stock"]:
            raise HTTPException(400, f"{item['name']} yetarli emas")
        total += Decimal(str(item["price"])) * item["quantity"]

    phone = body.phone.strip() if body.phone else ""
    if phone:
        try:
            phone = _normalize_phone(phone)
        except HTTPException:
            raise HTTPException(400, "Telefon raqam noto'g'ri") from None

    # Alohida write connection — shared db bilan race condition oldini olish uchun
    from pathlib import Path as _Path
    import aiosqlite as _aiosqlite
    from app.config import settings as _settings
    db_path = str(_Path(_settings.sqlite_path).resolve())

    async with _aiosqlite.connect(db_path, timeout=30.0) as wdb:
        await wdb.execute("PRAGMA journal_mode=WAL")
        await wdb.execute("PRAGMA busy_timeout=30000")
        await wdb.execute("BEGIN IMMEDIATE")
        try:
            cur = await wdb.execute(
                """
                INSERT INTO orders (user_id, total, address, phone, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (uid, float(total), body.address, phone or None, ORDER_STATUS_PENDING),
            )
            order_id = cur.lastrowid
            for item in cart:
                await wdb.execute(
                    """
                    INSERT INTO order_items (order_id, product_id, quantity, price)
                    VALUES (?, ?, ?, ?)
                    """,
                    (order_id, item["id"], item["quantity"], item["price"]),
                )
                await wdb.execute(
                    "UPDATE products SET stock = stock - ? WHERE id = ?",
                    (item["quantity"], item["id"]),
                )
            await wdb.execute("DELETE FROM cart_items WHERE user_id = ?", (uid,))

            item_names = ", ".join(item["name"] for item in cart[:2])
            if len(cart) > 2:
                item_names += f" va yana {len(cart) - 2} ta"
            await wdb.execute(
                """
                INSERT INTO notifications (user_id, title, message)
                VALUES (?, ?, ?)
                """,
                (
                    uid,
                    f"✅ Buyurtma #{order_id} qabul qilindi",
                    f"{item_names} — jami {float(total):,.0f} so'm. Tez orada yetkazib beramiz!",
                ),
            )
            await wdb.commit()
        except Exception as exc:
            await wdb.rollback()
            if isinstance(exc, HTTPException):
                raise
            logger.exception("create_order xatosi, user_id=%s", uid)
            raise HTTPException(
                503,
                "Buyurtma vaqtincha qabul qilinmadi. Iltimos, qayta urinib ko'ring.",
            ) from exc

    return {"order_id": order_id, "total": float(total), "status": ORDER_STATUS_PENDING}


# =====================================================================
# --- SHARHLAR (REVIEWS) TIZIMI ---
# =====================================================================

class ReviewCreate(BaseModel):
    rating: int
    comment: str | None = None
    photos: list[str] = []


@router.post("/review-photos")
async def upload_review_photos(
    files: list[UploadFile] = File(...),
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Sharh uchun rasmlar yuklash — max 6 ta"""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    if len(files) > 6:
        raise HTTPException(400, "Maksimal 6 ta rasm yuklanishi mumkin")

    REVIEW_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    urls: list[str] = []
    for file in files:
        content_type = file.content_type or ""
        if content_type not in ALLOWED_IMAGE_TYPES and not content_type.startswith("image/"):
            raise HTTPException(400, f"Faqat rasm fayllari qabul qilinadi: {content_type}")
        ext = Path(file.filename or "file").suffix or ".jpg"
        file_name = f"review_{uid}_{uuid.uuid4().hex[:8]}{ext}"
        file_path = REVIEW_PHOTOS_DIR / file_name
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        urls.append(f"/uploads/reviews/{file_name}")

    return {"ok": True, "urls": urls}


@router.get("/products/{product_id}/reviews")
async def get_reviews(product_id: int):
    rows = await fetch(
        """
        SELECT r.id, r.rating, r.content, r.photos, r.created_at,
               u.first_name, u.last_name, u.username
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.product_id = ? AND r.status = 'approved'
        ORDER BY r.created_at DESC
        """,
        product_id,
    )
    result = []
    for r in rows:
        first = r["first_name"] or ""
        last = r["last_name"] or ""
        name = f"{first} {last}".strip() or r["username"] or "Mijoz"
        try:
            photos = json.loads(r["photos"] or "[]")
        except (json.JSONDecodeError, TypeError):
            photos = []
        result.append({
            "id": r["id"],
            "rating": r["rating"],
            "comment": r["content"],
            "photos": photos,
            "created_at": r["created_at"],
            "user_name": name,
        })
    return result


@router.get("/products/{product_id}/can_review")
async def can_review(
    product_id: int,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    already = await fetchval(
        "SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ?",
        product_id, uid,
    )
    if already:
        return {"can_review": False, "reason": "already_reviewed"}

    # Faqat yetkazilgan buyurtmasi bo'lgan foydalanuvchi sharh yoza oladi
    delivered = await fetchval(
        """
        SELECT 1 FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
        LIMIT 1
        """,
        uid, product_id,
    )
    if not delivered:
        return {"can_review": False, "reason": "no_delivered_order"}

    return {"can_review": True, "reason": None}


@router.post("/products/{product_id}/reviews")
async def create_review(
    product_id: int,
    body: ReviewCreate,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    if not (1 <= body.rating <= 5):
        raise HTTPException(400, "Baho 1 dan 5 gacha bo'lishi kerak")

    already = await fetchval(
        "SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ?",
        product_id, uid,
    )
    if already:
        raise HTTPException(409, "Siz bu mahsulotga allaqachon sharh yozgansiz")

    product = await fetchrow("SELECT id FROM products WHERE id = ?", product_id)
    if not product:
        raise HTTPException(404, "Mahsulot topilmadi")

    if len(body.photos) > 6:
        raise HTTPException(400, "Maksimal 6 ta rasm yuklanishi mumkin")

    # Yetkazilgan buyurtma borligini tekshir
    delivered = await fetchval(
        """
        SELECT 1 FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
        LIMIT 1
        """,
        uid, product_id,
    )
    if not delivered:
        raise HTTPException(403, "Sharh yozish uchun mahsulot yetkazilgan bo'lishi kerak")

    content = body.comment.strip() if body.comment else None
    photos_json = json.dumps(body.photos)
    await execute(
        "INSERT INTO reviews (user_id, product_id, rating, content, photos, status) VALUES (?, ?, ?, ?, ?, 'approved')",
        uid, product_id, body.rating, content, photos_json,
    )
    await bump_version()
    return {"ok": True}


# =====================================================================
# --- PROMOKOD VA YETKAZIB BERISH ENDPOINTLARI ---
# =====================================================================

class PromoApply(BaseModel):
    code: str


async def _award_delivery_promos(order_id: int, user_id: int) -> None:
    """Buyurtma yetkazilganda 2 ta promokod avtomatik beradi (3 kunlik amal qilish muddati)."""
    from datetime import timedelta
    valid_until = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
    promos = [
        (
            f"MR{order_id:04d}CHEGIRMA10",
            "Keyingi buyurtmaga 10% chegirma",
            "10%",
            10,
            200_000,
        ),
        (
            f"MR{order_id:04d}KARGO5",
            "Kargo uchun 5% chegirma",
            "5%",
            5,
            150_000,
        ),
    ]
    for code, title, discount_label, discount_percent, min_order in promos:
        try:
            await execute(
                """
                INSERT OR IGNORE INTO promo_codes
                    (user_id, order_id, code, title, discount_label, discount_percent, min_order, valid_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                user_id,
                order_id,
                code,
                title,
                discount_label,
                discount_percent,
                min_order,
                valid_until,
            )
        except Exception:
            pass


@router.get("/promo-codes")
async def list_promo_codes(
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Foydalanuvchining barcha promokodlarini qaytaradi."""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    await execute(
        """
        UPDATE promo_codes SET status = 'expired'
        WHERE user_id = ? AND status = 'active' AND DATE(valid_until) < DATE('now')
        """,
        uid,
    )

    rows = await fetch(
        "SELECT * FROM promo_codes WHERE user_id = ? ORDER BY id DESC",
        uid,
    )
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "code": r["code"],
            "title": r["title"],
            "discountLabel": r["discount_label"],
            "discountPercent": r["discount_percent"],
            "minOrder": r["min_order"],
            "validUntil": r["valid_until"],
            "status": r["status"],
            "orderRef": f"Buyurtma MR-{r['order_id']:04d}" if r.get("order_id") else "",
            "createdAt": r.get("created_at", ""),
        })
    return result


@router.post("/promo/apply")
async def apply_promo_code(
    body: PromoApply,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Promokod qo'llash — bildirishnoma yuboradi"""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)
    code = body.code.strip().upper()
    if not code:
        raise HTTPException(400, "Promokod bo'sh bo'lishi mumkin emas")

    await execute(
        """
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, ?, ?)
        """,
        uid,
        f"🎟️ Promokod qo'shildi: {code}",
        "Promokodingiz muvaffaqiyatli qo'shildi va keyingi buyurtmangizda ishlatiladi.",
    )
    return {"ok": True, "code": code}


@router.post("/orders/{order_id}/deliver")
async def mark_delivered(
    order_id: int,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Buyurtmani yetkazilgan deb belgilash — 2 ta promokod avtomatik beriladi."""
    order = await fetchrow("SELECT * FROM orders WHERE id = ?", order_id)
    if not order:
        raise HTTPException(404, "Buyurtma topilmadi")

    already_delivered = (order.get("status") or "") == "Yetkazildi"

    await execute(
        "UPDATE orders SET status = ? WHERE id = ?",
        "Yetkazildi", order_id,
    )

    if not already_delivered:
        await _award_delivery_promos(order_id, order["user_id"])
        await execute(
            """
            INSERT INTO notifications (user_id, title, message)
            VALUES (?, ?, ?)
            """,
            order["user_id"],
            f"🚚 Buyurtma MR-{order_id:04d} yetkazildi!",
            "Buyurtmangiz yetkazib berildi! Sizga 2 ta maxsus promokod berildi — 'Promokodlar' bo'limini tekshiring 🎟️",
        )
    return {"ok": True, "order_id": order_id, "status": "Yetkazildi"}


# =====================================================================
# --- HIKOYALAR (STORIES) TIZIMI ENDPOINTLARI ---
# =====================================================================

@router.get("/night-market")
async def get_night_market():
    """Tungi bozor mahsulotlarini qaytaradi."""
    await execute(
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
    rows = await fetch(
        "SELECT * FROM night_market_items WHERE is_active = 1 ORDER BY created_at DESC"
    )
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "image_url": r["image_url"] or "",
            "day_price": r["day_price"],
            "night_discount_percent": r["night_discount_percent"],
            "total_stock": r["total_stock"],
            "sold_count": r["sold_count"],
        }
        for r in rows
    ]


@router.post("/night-market/{item_id}/buy")
async def buy_night_market_item(
    item_id: int,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Tungi bozor mahsulotini to'g'ridan-to'g'ri buyurtma qilish."""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    from pathlib import Path as _Path
    import aiosqlite as _aiosqlite
    from app.config import settings as _settings

    db_path = str(_Path(_settings.sqlite_path).resolve())

    async with _aiosqlite.connect(db_path, timeout=30.0) as wdb:
        wdb.row_factory = _aiosqlite.Row
        await wdb.execute("PRAGMA journal_mode=WAL")
        await wdb.execute("PRAGMA busy_timeout=30000")
        await wdb.execute("BEGIN IMMEDIATE")
        try:
            cur = await wdb.execute(
                "SELECT * FROM night_market_items WHERE id = ? AND is_active = 1",
                (item_id,),
            )
            item = await cur.fetchone()
            if not item:
                await wdb.rollback()
                raise HTTPException(404, "Mahsulot topilmadi yoki faol emas")

            item = dict(item)
            remaining = item["total_stock"] - item["sold_count"]
            if remaining <= 0:
                await wdb.rollback()
                raise HTTPException(400, "Mahsulot tugab ketgan")

            night_price = round(item["day_price"] * (1 - item["night_discount_percent"] / 100))

            # Sotilgan soni ++
            await wdb.execute(
                "UPDATE night_market_items SET sold_count = sold_count + 1 WHERE id = ?",
                (item_id,),
            )

            # Foydalanuvchi telefon raqami
            cur2 = await wdb.execute(
                "SELECT phone FROM users WHERE id = ?", (uid,)
            )
            u = await cur2.fetchone()
            user_phone = (dict(u).get("phone") or "") if u else ""

            # Orders jadvaliga yoz (admin panelda ko'rinsin)
            cur3 = await wdb.execute(
                """
                INSERT INTO orders (user_id, total, address, phone, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    uid,
                    float(night_price),
                    f"[TUNGI BOZOR] {item['name']} (-{item['night_discount_percent']}%)",
                    user_phone or None,
                    ORDER_STATUS_PENDING,
                ),
            )
            order_id = cur3.lastrowid

            # Bildirishnoma
            await wdb.execute(
                "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
                (
                    uid,
                    f"🌙 Tungi bozor buyurtmasi #{order_id}",
                    f"'{item['name']}' mahsuloti {night_price:,} so'mga buyurtma qilindi! Tez orada yetkaziladi.",
                ),
            )

            await wdb.commit()
            return {
                "ok": True,
                "order_id": order_id,
                "price": night_price,
                "status": ORDER_STATUS_PENDING,
            }
        except HTTPException:
            await wdb.rollback()
            raise
        except Exception as exc:
            await wdb.rollback()
            raise HTTPException(500, f"Server xatosi: {exc}") from exc


@router.get("/settings/support")
async def get_support_settings():
    """Qo'llab-quvvatlash sozlamalarini qaytaradi (admin belgilaydi)."""
    await execute(
        """
        CREATE TABLE IF NOT EXISTS support_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            support_username TEXT DEFAULT '',
            support_group TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    await execute("INSERT OR IGNORE INTO support_settings (id) VALUES (1)")
    row = await fetchrow("SELECT support_username, support_group FROM support_settings WHERE id = 1")
    return {
        "support_username": row["support_username"] or "" if row else "",
        "support_group": row["support_group"] or "" if row else "",
    }


@router.get("/settings/cargo-rate")
async def get_cargo_rate():
    """Kargo narxini qaytaradi (admin belgilaydi)."""
    await execute(
        """
        CREATE TABLE IF NOT EXISTS cargo_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            rate_per_kg INTEGER DEFAULT 12000,
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    await execute("INSERT OR IGNORE INTO cargo_settings (id) VALUES (1)")
    row = await fetchrow("SELECT rate_per_kg FROM cargo_settings WHERE id = 1")
    return {"rate_per_kg": row["rate_per_kg"] if row else 12000}


@router.get("/payment-info")
async def get_payment_info():
    """Admin tomonidan kiritilgan to'lov karta ma'lumotlari."""
    row = await fetchrow("SELECT card_number, card_holder, bank_name FROM payment_settings WHERE id = 1")
    if not row:
        return {"card_number": "", "card_holder": "", "bank_name": ""}
    return {
        "card_number": row["card_number"] or "",
        "card_holder": row["card_holder"] or "",
        "bank_name": row["bank_name"] or "",
    }


@router.get("/stories")
async def get_stories():
    """Bazadagi barcha faol hikoyalarni o'qib beradi (rasm + video)"""
    rows = await fetch(
        """
        SELECT id, name, image_url,
               COALESCE(media_type, 'image') as media_type,
               0 as seen
        FROM stories
        WHERE is_active = 1
        ORDER BY id DESC
        """
    )
    return rows if rows else []


@router.post("/stories/upload")
async def upload_story(
    file: UploadFile = File(...),
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Foydalanuvchi yuklagan rasm yoki videoni qabul qilib, serverga va bazaga saqlaydi"""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE_TYPES or content_type.startswith("image/"):
        media_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES or content_type.startswith("video/"):
        media_type = "video"
    else:
        raise HTTPException(400, f"Rasm yoki video fayl yuklang (qabul qilinmagan tur: {content_type})")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "file").suffix or (".jpg" if media_type == "image" else ".mp4")
    file_name = f"story_{uid}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = UPLOAD_DIR / file_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    media_url = f"/uploads/stories/{file_name}"

    user_row = await fetchrow("SELECT first_name FROM users WHERE id = ?", uid)
    user_name = (user_row["first_name"] if user_row and user_row["first_name"] else None) or "Mijoz"

    await execute(
        "INSERT INTO stories (user_id, name, image_url, media_type, is_active) VALUES (?, ?, ?, ?, 1)",
        uid, user_name, media_url, media_type,
    )


# =====================================================================
# --- GURUHLI XARIDLAR (GROUP BUY) ENDPOINTLARI ---
# =====================================================================

def _deadline_to_ms(deadline_str: str | None) -> int:
    """Deadline stringni millisecondga aylantiradi. Yo'q bo'lsa 48 soat."""
    if deadline_str:
        try:
            dt = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
        except Exception:
            pass
    return int((datetime.now().timestamp() + 48 * 3600) * 1000)


def _group_buy_public(row: dict, uid: int, joined_ids: set) -> dict:
    required = int(row.get("required_participants") or 1)
    current = int(row.get("current_participants") or 0)
    group_price = row.get("group_price")
    if not group_price:
        group_price = round(float(row.get("product_price") or 0) * 0.80)
    return {
        "id": row["id"],
        "name": row.get("product_name") or "",
        "image": row.get("product_image") or "",
        "groupPrice": float(group_price),
        "currentMembers": current,
        "requiredMembers": required,
        "expiresAt": _deadline_to_ms(row.get("deadline")),
        "status": row.get("status") or "active",
        "isJoined": row["id"] in joined_ids,
        "progressPercent": min(100, int((current / required) * 100)) if required else 0,
        "completedAt": (row.get("created_at") or "")[:10],
    }


@router.get("/group-buys")
async def list_group_buys(
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Barcha guruhli xaridlarni qaytaradi — foydalanuvchi qo'shilgan/qo'shilmaganini ham."""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    rows = await fetch(
        """
        SELECT g.*,
               p.name  AS product_name,
               COALESCE(g.image_url, p.image_url) AS product_image,
               p.price AS product_price
        FROM group_buys g
        JOIN products p ON p.id = g.product_id
        ORDER BY g.id DESC
        """,
    )

    joined_rows = await fetch(
        "SELECT group_buy_id FROM group_buy_participants WHERE user_id = ?",
        uid,
    )
    joined_ids = {r["group_buy_id"] for r in joined_rows}

    active, completed = [], []
    for r in rows:
        item = _group_buy_public(r, uid, joined_ids)
        if r.get("status") == "active":
            active.append(item)
        else:
            completed.append(item)

    return {"active": active, "completed": completed}


@router.post("/group-buys/{group_id}/join")
async def join_group_buy(
    group_id: int,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Guruhli xaridga qo'shilish — BEGIN IMMEDIATE orqali xavfsiz."""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    db_path = str(settings.sqlite_path)
    async with aiosqlite.connect(db_path, timeout=30.0) as wdb:
        wdb.row_factory = aiosqlite.Row
        await wdb.execute("PRAGMA journal_mode=WAL")
        await wdb.execute("PRAGMA busy_timeout=30000")
        await wdb.execute("BEGIN IMMEDIATE")
        try:
            cur = await wdb.execute("SELECT * FROM group_buys WHERE id = ?", (group_id,))
            group = await cur.fetchone()
            if not group:
                raise HTTPException(404, "Guruhli xarid topilmadi")
            group = dict(group)

            if group.get("status") != "active":
                raise HTTPException(400, "Bu guruhli xarid allaqachon yakunlangan yoki bekor qilingan")

            if group.get("deadline"):
                try:
                    dl = datetime.fromisoformat(group["deadline"].replace("Z", "+00:00"))
                    if datetime.now() > dl.replace(tzinfo=None):
                        await wdb.execute(
                            "UPDATE group_buys SET status = 'cancelled' WHERE id = ?",
                            (group_id,),
                        )
                        await wdb.commit()
                        raise HTTPException(400, "Guruhli xarid muddati tugagan")
                except HTTPException:
                    raise
                except Exception:
                    pass

            cur = await wdb.execute(
                "SELECT 1 FROM group_buy_participants WHERE group_buy_id = ? AND user_id = ?",
                (group_id, uid),
            )
            if await cur.fetchone():
                raise HTTPException(409, "Siz bu guruhga allaqachon qo'shilgansiz")

            await wdb.execute(
                "INSERT INTO group_buy_participants (group_buy_id, user_id) VALUES (?, ?)",
                (group_id, uid),
            )

            cur = await wdb.execute(
                "SELECT COUNT(*) AS cnt FROM group_buy_participants WHERE group_buy_id = ?",
                (group_id,),
            )
            new_count = dict(await cur.fetchone())["cnt"]

            await wdb.execute(
                "UPDATE group_buys SET current_participants = ? WHERE id = ?",
                (new_count, group_id),
            )

            required = int(group.get("required_participants") or 1)
            completed = new_count >= required
            if completed:
                await wdb.execute(
                    "UPDATE group_buys SET status = 'completed', current_participants = ? WHERE id = ?",
                    (required, group_id),
                )
                await wdb.execute(
                    """
                    INSERT INTO notifications (user_id, title, message)
                    VALUES (?, ?, ?)
                    """,
                    (
                        uid,
                        "🎉 Guruhli xarid yakunlandi!",
                        "Tabriklaymiz! Guruh to'ldi va xarid muvaffaqiyatli yakunlandi.",
                    ),
                )

            await wdb.commit()
            return {
                "ok": True,
                "current_members": new_count,
                "required_members": required,
                "completed": completed,
            }
        except HTTPException:
            await wdb.rollback()
            raise
        except Exception as exc:
            await wdb.rollback()
            raise HTTPException(500, f"Server xatosi: {exc}") from exc


@router.delete("/group-buys/{group_id}/leave")
async def leave_group_buy(
    group_id: int,
    x_telegram_user_id: str = Header(..., alias="X-Telegram-User-Id"),
):
    """Guruhli xariddan chiqish."""
    tid = _user_id_header(x_telegram_user_id)
    uid = await _db_user_id(tid)

    db_path = str(settings.sqlite_path)
    async with aiosqlite.connect(db_path, timeout=30.0) as wdb:
        wdb.row_factory = aiosqlite.Row
        await wdb.execute("PRAGMA journal_mode=WAL")
        await wdb.execute("PRAGMA busy_timeout=30000")
        await wdb.execute("BEGIN IMMEDIATE")
        try:
            cur = await wdb.execute("SELECT * FROM group_buys WHERE id = ?", (group_id,))
            group = await cur.fetchone()
            if not group:
                raise HTTPException(404, "Guruhli xarid topilmadi")
            group = dict(group)

            if group.get("status") != "active":
                raise HTTPException(400, "Yakunlangan guruhdan chiqib bo'lmaydi")

            cur = await wdb.execute(
                "DELETE FROM group_buy_participants WHERE group_buy_id = ? AND user_id = ?",
                (group_id, uid),
            )
            if cur.rowcount == 0:
                raise HTTPException(404, "Siz bu guruhda emassiz")

            cur = await wdb.execute(
                "SELECT COUNT(*) AS cnt FROM group_buy_participants WHERE group_buy_id = ?",
                (group_id,),
            )
            new_count = dict(await cur.fetchone())["cnt"]
            await wdb.execute(
                "UPDATE group_buys SET current_participants = ? WHERE id = ?",
                (new_count, group_id),
            )

            await wdb.commit()
            return {"ok": True, "current_members": new_count}
        except HTTPException:
            await wdb.rollback()
            raise
        except Exception as exc:
            await wdb.rollback()
            raise HTTPException(500, f"Server xatosi: {exc}") from exc

    return {"ok": True, "image_url": media_url, "media_type": media_type}