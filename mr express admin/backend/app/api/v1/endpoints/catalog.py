from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.db import sqlite as db

router = APIRouter()

UPLOAD_ROOT = Path(settings.uploads_dir)


@router.get("/categories")
async def list_categories():
    """Ierarxik kategoriyalar — Telegram bot SQLite bazasidan."""
    rows = await db.fetch(
        """
        SELECT id, name, slug, icon, sort_order, parent_id
        FROM categories
        ORDER BY COALESCE(parent_id, id), sort_order, name
        """
    )
    parents = [r for r in rows if not r.get("parent_id")]
    children_by_parent: dict[int, list] = {}
    for r in rows:
        pid = r.get("parent_id")
        if pid:
            children_by_parent.setdefault(pid, []).append(r)

    tree = []
    for p in parents:
        tree.append(
            {
                **p,
                "subcategories": children_by_parent.get(p["id"], []),
            }
        )
    return {"items": tree, "flat": rows}


@router.get("/products")
async def list_products(
    page: int = 1,
    limit: int = 50,
    category_id: int | None = None,
):
    page = max(1, page)
    limit = min(max(1, limit), 500)
    offset = (page - 1) * limit
    conditions = ["1=1"]
    params: list = []
    if category_id:
        conditions.append("p.category_id = ?")
        params.append(category_id)

    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"""
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE {where}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
        """,
        *params,
        limit,
        offset,
    )
    for r in rows:
        imgs = await db.fetch(
            "SELECT image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order",
            r["id"],
        )
        r["images"] = [i["image_url"] for i in imgs] if imgs else ([r["image_url"]] if r.get("image_url") else [])
        r["price"] = float(r["price"])
        if r.get("old_price"):
            r["old_price"] = float(r["old_price"])

    total = await db.fetchval(f"SELECT COUNT(*) FROM products p WHERE {where}", *params)
    return {"items": rows, "total": total or 0, "page": page, "limit": limit}


@router.post("/products")
async def create_product(
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    stock: int = Form(100),
    category_id: int = Form(...),
    subcategory_id: int | None = Form(None),
    old_price: float | None = Form(None),
    images: list[UploadFile] | None = File(None),
):
    image_files = images or []
    cat_id = subcategory_id or category_id
    cat = await db.fetchrow("SELECT id FROM categories WHERE id = ?", cat_id)
    if not cat:
        raise HTTPException(400, "Kategoriya topilmadi")

    product_id = await db.execute(
        """
        INSERT INTO products (category_id, name, description, price, old_price, stock, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        cat_id,
        name.strip(),
        description,
        price,
        old_price,
        stock,
        None,
    )

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    saved_urls: list[str] = []
    for i, img in enumerate(image_files[:6]):
        if not img.filename:
            continue
        ext = Path(img.filename).suffix.lower() or ".jpg"
        fname = f"{product_id}_{uuid4().hex[:8]}{ext}"
        dest = UPLOAD_ROOT / fname
        content = await img.read()
        dest.write_bytes(content)
        url = f"/uploads/{fname}"
        saved_urls.append(url)
        await db.execute(
            "INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)",
            product_id,
            url,
            i,
        )

    if saved_urls:
        await db.execute(
            "UPDATE products SET image_url = ? WHERE id = ?",
            saved_urls[0],
            product_id,
        )

    row = await db.fetchrow("SELECT * FROM products WHERE id = ?", product_id)
    return {"item": row, "images": saved_urls}
