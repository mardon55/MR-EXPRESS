import json
import logging
import os
import shutil
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, UploadFile, File
from pydantic import BaseModel

from app.database import execute, fetch, fetchrow, fetchval, get_db, get_or_create_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

ORDER_STATUS_ACTIVE = "Aktiv"
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
    return await fetch("SELECT * FROM categories ORDER BY sort_order")


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
        conditions.append("category_id = ?")
        params.append(category_id)
    if discount_only:
        conditions.append("is_discount = 1")
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
    return _product_row(row)


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

    db = await get_db()
    await db.commit()
    await db.execute("BEGIN IMMEDIATE")
    try:
        cur = await db.execute(
            """
            INSERT INTO orders (user_id, total, address, phone, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (uid, float(total), body.address, phone or None, ORDER_STATUS_ACTIVE),
        )
        order_id = cur.lastrowid
        for item in cart:
            await db.execute(
                """
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
                """,
                (order_id, item["id"], item["quantity"], item["price"]),
            )
            await db.execute(
                "UPDATE products SET stock = stock - ? WHERE id = ?",
                (item["quantity"], item["id"]),
            )
        await db.execute("DELETE FROM cart_items WHERE user_id = ?", (uid,))
        
        item_names = ", ".join(item["name"] for item in cart[:2])
        if len(cart) > 2:
            item_names += f" va yana {len(cart) - 2} ta"
        await db.execute(
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
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("create_order xatosi, user_id=%s", uid)
        raise HTTPException(
            503,
            "Buyurtma vaqtincha qabul qilinmadi. Iltimos, qayta urinib ko'ring.",
        ) from exc

    return {"order_id": order_id, "total": float(total), "status": ORDER_STATUS_ACTIVE}


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
        WHERE r.product_id = ?
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

    delivered = await fetchval(
        """
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ?
          AND (o.status = 'Yetkazildi' OR o.status = 'delivered')
        LIMIT 1
        """,
        uid, product_id,
    )
    if not delivered:
        return {"can_review": False, "reason": "not_delivered"}

    already = await fetchval(
        "SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ?",
        product_id, uid,
    )
    if already:
        return {"can_review": False, "reason": "already_reviewed"}

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

    delivered = await fetchval(
        """
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ?
          AND (o.status = 'Yetkazildi' OR o.status = 'delivered')
        LIMIT 1
        """,
        uid, product_id,
    )
    if not delivered:
        raise HTTPException(403, "Sharh yozish uchun buyurtma yetkazib berilgan bo'lishi kerak")

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

    content = body.comment.strip() if body.comment else None
    photos_json = json.dumps(body.photos)
    await execute(
        "INSERT INTO reviews (user_id, product_id, rating, content, photos) VALUES (?, ?, ?, ?, ?)",
        uid, product_id, body.rating, content, photos_json,
    )
    return {"ok": True}


# =====================================================================
# --- PROMOKOD VA YETKAZIB BERISH ENDPOINTLARI ---
# =====================================================================

class PromoApply(BaseModel):
    code: str


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
    """Buyurtmani yetkazilgan deb belgilash (admin tomonidan chaqiriladi)"""
    order = await fetchrow("SELECT * FROM orders WHERE id = ?", order_id)
    if not order:
        raise HTTPException(404, "Buyurtma topilmadi")
    await execute(
        "UPDATE orders SET status = ? WHERE id = ?",
        "Yetkazildi", order_id,
    )
    await execute(
        """
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, ?, ?)
        """,
        order["user_id"],
        f"🚚 Buyurtma #{order_id} yetkazildi",
        "Buyurtmangiz muvaffaqiyatli yetkazib berildi. Xaridingiz uchun rahmat!",
    )
    return {"ok": True, "order_id": order_id, "status": "Yetkazildi"}


# =====================================================================
# --- HIKOYALAR (STORIES) TIZIMI ENDPOINTLARI ---
# =====================================================================

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

    return {"ok": True, "image_url": media_url, "media_type": media_type}