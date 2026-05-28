from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.db import sqlite as db
from app.db.sqlite import bump_version

router = APIRouter()
UPLOAD_ROOT = Path(settings.uploads_dir)

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/mpeg",
}


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _reel_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "video_url": row["video_url"],
        "thumbnail_url": row.get("thumbnail_url"),
        "price": float(row["price"]) if row.get("price") is not None else 0,
        "product_id": row["product_id"],
        "product_name": row.get("product_name"),
        "product_description": row.get("product_description"),
        "product_image_url": row.get("product_image_url"),
    }


async def _reel_item(reel_id: int) -> dict | None:
    row = await db.fetchrow(
        """
        SELECT r.id, r.video_url, r.thumbnail_url, r.price, r.product_id,
               p.name AS product_name, p.description AS product_description,
               p.image_url AS product_image_url
        FROM reels r
        LEFT JOIN products p ON p.id = r.product_id
        WHERE r.id = ?
        """,
        reel_id,
    )
    if not row:
        return None
    return _reel_dict(row)


@router.get("")
async def list_reels():
    rows = await db.fetch(
        """
        SELECT r.id, r.video_url, r.thumbnail_url, r.price, r.product_id,
               p.name AS product_name, p.description AS product_description,
               p.image_url AS product_image_url
        FROM reels r
        LEFT JOIN products p ON p.id = r.product_id
        ORDER BY r.id DESC
        """
    )
    items = [_reel_dict(r) for r in rows]
    return {"items": items, "total": len(items)}


@router.post("")
async def create_reel(
    product_id: int = Form(...),
    price: float = Form(...),
    video: UploadFile = File(...),
    thumbnail: UploadFile = File(None),
):
    product = await db.fetchrow(
        "SELECT id, name, price, description, image_url FROM products WHERE id = ?",
        product_id,
    )
    if not product:
        raise HTTPException(400, "Mahsulot topilmadi")

    if price <= 0 and product.get("price"):
        price = float(product["price"])
    if price <= 0:
        raise HTTPException(400, "Narx 0 dan katta bo'lishi kerak")

    if not video.filename:
        raise HTTPException(400, "Video fayl tanlanmagan")

    content_type = (video.content_type or "").lower()
    if content_type and content_type not in ALLOWED_VIDEO_TYPES:
        if not content_type.startswith("video/"):
            raise HTTPException(400, "Faqat video fayl yuklash mumkin (mp4, webm va h.k.)")

    ext = Path(video.filename).suffix.lower()
    if ext not in {".mp4", ".webm", ".mov", ".avi", ".mpeg", ".mpg"}:
        ext = ".mp4"

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    fname = f"reel_{uuid4().hex[:12]}{ext}"
    dest = UPLOAD_ROOT / fname
    content = await video.read()
    if not content:
        raise HTTPException(400, "Video fayl bo'sh")
    dest.write_bytes(content)
    video_url = f"/uploads/{fname}"

    thumbnail_url = None
    if thumbnail and thumbnail.filename:
        img_ext = Path(thumbnail.filename).suffix.lower()
        if img_ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            img_ext = ".jpg"
        img_fname = f"reel_thumb_{uuid4().hex[:10]}{img_ext}"
        img_dest = UPLOAD_ROOT / img_fname
        img_content = await thumbnail.read()
        if img_content:
            img_dest.write_bytes(img_content)
            thumbnail_url = f"/uploads/{img_fname}"

    reel_id = await db.execute(
        """
        INSERT INTO reels (video_url, thumbnail_url, product_id, price, is_active)
        VALUES (?, ?, ?, ?, 1)
        """,
        video_url,
        thumbnail_url,
        product_id,
        price,
    )
    await bump_version()
    return {
        "item": {
            "id": reel_id,
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "price": float(price),
            "product_id": product_id,
            "product_name": product.get("name"),
            "product_description": product.get("description"),
            "product_image_url": product.get("image_url"),
        }
    }


@router.delete("/{reel_id}")
async def delete_reel(reel_id: int):
    row = await db.fetchrow("SELECT id, video_url FROM reels WHERE id = ?", reel_id)
    if not row:
        raise HTTPException(404, "Reel topilmadi")

    if row.get("video_url", "").startswith("/uploads/"):
        file_path = UPLOAD_ROOT / Path(row["video_url"]).name
        if file_path.is_file():
            file_path.unlink(missing_ok=True)

    await db.execute("DELETE FROM reels WHERE id = ?", reel_id)
    return {"ok": True}
