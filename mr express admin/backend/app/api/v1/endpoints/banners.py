from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.config import settings
from app.db import sqlite as db
from app.db.sqlite import bump_version

router = APIRouter()
UPLOAD_ROOT = Path(settings.uploads_dir)


class BannerPatch(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    link_url: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class BannerProductsBody(BaseModel):
    product_ids: list[int]


async def _banner_row(banner_id: int) -> dict | None:
    row = await db.fetchrow("SELECT * FROM banners WHERE id = ?", banner_id)
    if not row:
        return None
    products = await db.fetch(
        """
        SELECT p.id, p.name, p.price, p.image_url
        FROM banner_products bp
        JOIN products p ON p.id = bp.product_id
        WHERE bp.banner_id = ?
        """,
        banner_id,
    )
    for p in products:
        p["price"] = float(p["price"])
    return {
        "id": row["id"],
        "title": row["title"],
        "subtitle": row.get("subtitle"),
        "image_url": row.get("image_url"),
        "link_url": row.get("link_url"),
        "sort_order": row.get("sort_order") or 0,
        "is_active": bool(row.get("is_active", 1)),
        "products": products,
    }


@router.get("")
async def list_banners():
    rows = await db.fetch(
        "SELECT id FROM banners ORDER BY sort_order, id DESC"
    )
    items = []
    for r in rows:
        item = await _banner_row(r["id"])
        if item:
            items.append(item)
    return {"items": items, "total": len(items)}


@router.post("")
async def create_banner(
    title: str = Form(...),
    subtitle: str = Form(""),
    link_url: str = Form(""),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    image: UploadFile | None = File(None),
):
    image_url = None
    if image and image.filename:
        ext = Path(image.filename).suffix.lower() or ".jpg"
        fname = f"banner_{uuid4().hex[:10]}{ext}"
        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        dest = UPLOAD_ROOT / fname
        dest.write_bytes(await image.read())
        image_url = f"/uploads/{fname}"

    banner_id = await db.execute(
        """
        INSERT INTO banners (title, subtitle, image_url, link_url, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        title.strip(),
        subtitle.strip() or None,
        image_url,
        link_url.strip() or None,
        sort_order,
        int(is_active),
    )
    item = await _banner_row(banner_id)
    await bump_version()
    return {"item": item}


@router.patch("/{banner_id}")
async def patch_banner(banner_id: int, body: BannerPatch):
    row = await db.fetchrow("SELECT id FROM banners WHERE id = ?", banner_id)
    if not row:
        raise HTTPException(404, "Banner topilmadi")

    fields = []
    params: list = []
    if body.title is not None:
        fields.append("title = ?")
        params.append(body.title.strip())
    if body.subtitle is not None:
        fields.append("subtitle = ?")
        params.append(body.subtitle.strip() or None)
    if body.link_url is not None:
        fields.append("link_url = ?")
        params.append(body.link_url.strip() or None)
    if body.sort_order is not None:
        fields.append("sort_order = ?")
        params.append(body.sort_order)
    if body.is_active is not None:
        fields.append("is_active = ?")
        params.append(int(body.is_active))

    if fields:
        params.append(banner_id)
        await db.execute(
            f"UPDATE banners SET {', '.join(fields)} WHERE id = ?",
            *params,
        )
        await bump_version()

    return {"item": await _banner_row(banner_id)}


@router.delete("/{banner_id}")
async def delete_banner(banner_id: int):
    row = await db.fetchrow("SELECT id FROM banners WHERE id = ?", banner_id)
    if not row:
        raise HTTPException(404, "Banner topilmadi")
    await db.execute("DELETE FROM banners WHERE id = ?", banner_id)
    await bump_version()
    return {"ok": True}


@router.post("/{banner_id}/products")
async def link_banner_products(banner_id: int, body: BannerProductsBody):
    row = await db.fetchrow("SELECT id FROM banners WHERE id = ?", banner_id)
    if not row:
        raise HTTPException(404, "Banner topilmadi")

    await db.execute("DELETE FROM banner_products WHERE banner_id = ?", banner_id)
    for pid in body.product_ids:
        exists = await db.fetchrow("SELECT id FROM products WHERE id = ?", pid)
        if exists:
            await db.execute(
                "INSERT OR IGNORE INTO banner_products (banner_id, product_id) VALUES (?, ?)",
                banner_id,
                pid,
            )

    await bump_version()
    return {"item": await _banner_row(banner_id)}


@router.post("/{banner_id}/image")
async def upload_banner_image(banner_id: int, image: UploadFile = File(...)):
    row = await db.fetchrow("SELECT id FROM banners WHERE id = ?", banner_id)
    if not row:
        raise HTTPException(404, "Banner topilmadi")

    ext = Path(image.filename or "").suffix.lower() or ".jpg"
    fname = f"banner_{banner_id}_{uuid4().hex[:8]}{ext}"
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_ROOT / fname
    dest.write_bytes(await image.read())
    url = f"/uploads/{fname}"
    await db.execute("UPDATE banners SET image_url = ? WHERE id = ?", url, banner_id)
    await bump_version()
    return {"item": await _banner_row(banner_id)}
