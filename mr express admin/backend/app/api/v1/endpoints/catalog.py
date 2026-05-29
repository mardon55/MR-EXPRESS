from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.db import sqlite as db
from app.db.sqlite import bump_version

router = APIRouter()

UPLOAD_ROOT = Path(settings.uploads_dir)


@router.get("/categories")
async def list_categories():
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
    is_discount: int | None = None,
):
    page = max(1, page)
    limit = min(max(1, limit), 500)
    offset = (page - 1) * limit
    conditions = ["COALESCE(p.is_reel_product, 0) = 0"]
    params: list = []
    if category_id:
        conditions.append("p.category_id = ?")
        params.append(category_id)
    if is_discount is not None:
        conditions.append("p.is_discount = ?")
        params.append(is_discount)

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
    import json
    result = []
    for r in rows:
        imgs = await db.fetch(
            "SELECT image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order",
            r["id"],
        )
        item = dict(r)
        item["images"] = [i["image_url"] for i in imgs] if imgs else ([r["image_url"]] if r.get("image_url") else [])
        item["price"] = float(r["price"]) if r.get("price") is not None else 0.0
        item["old_price"] = float(r["old_price"]) if r.get("old_price") else None
        item["is_featured"] = bool(r.get("is_featured", 0))
        item["is_discount"] = bool(r.get("is_discount", 0))
        if item.get("attributes"):
            try:
                item["attributes"] = json.loads(item["attributes"])
            except Exception:
                item["attributes"] = None
        result.append(item)

    total = await db.fetchval(f"SELECT COUNT(*) FROM products p WHERE {where}", *params)
    return {"items": result, "total": total or 0, "page": page, "limit": limit}


@router.post("/products")
async def create_product(
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    stock: int = Form(100),
    category_id: int = Form(...),
    subcategory_id: int | None = Form(None),
    old_price: float | None = Form(None),
    attributes: str | None = Form(None),
    is_featured: int = Form(0),
    is_discount: int = Form(0),
    images: list[UploadFile] | None = File(None),
):
    image_files = images or []
    cat_id = subcategory_id or category_id
    cat = await db.fetchrow("SELECT id FROM categories WHERE id = ?", cat_id)
    if not cat:
        raise HTTPException(400, "Kategoriya topilmadi")

    product_id = await db.execute(
        """
        INSERT INTO products (category_id, name, description, price, old_price, stock, image_url, attributes, is_featured, is_discount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        cat_id,
        name.strip(),
        description,
        price,
        old_price if old_price and old_price > 0 else None,
        stock,
        None,
        attributes,
        is_featured,
        is_discount,
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
    await bump_version()
    return {
        "item": {
            **dict(row),
            "price": float(row["price"]) if row.get("price") is not None else 0.0,
            "old_price": float(row["old_price"]) if row.get("old_price") else None,
            "is_featured": bool(row.get("is_featured", 0)),
            "is_discount": bool(row.get("is_discount", 0)),
            "images": saved_urls,
        },
        "images": saved_urls,
    }


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    stock: int = Form(100),
    category_id: int = Form(...),
    subcategory_id: int | None = Form(None),
    old_price: float | None = Form(None),
    attributes: str | None = Form(None),
    is_featured: int = Form(0),
    is_discount: int = Form(0),
    images: list[UploadFile] | None = File(None),
):
    existing = await db.fetchrow("SELECT id FROM products WHERE id = ?", product_id)
    if not existing:
        raise HTTPException(404, "Mahsulot topilmadi")

    cat_id = subcategory_id or category_id
    cat = await db.fetchrow("SELECT id FROM categories WHERE id = ?", cat_id)
    if not cat:
        raise HTTPException(400, "Kategoriya topilmadi")

    await db.execute(
        """
        UPDATE products SET
            category_id = ?, name = ?, description = ?, price = ?,
            old_price = ?, stock = ?, is_featured = ?, is_discount = ?,
            attributes = ?
        WHERE id = ?
        """,
        cat_id,
        name.strip(),
        description,
        price,
        old_price if old_price and old_price > 0 else None,
        stock,
        is_featured,
        is_discount,
        attributes,
        product_id,
    )

    image_files = [img for img in (images or []) if img.filename]
    saved_urls: list[str] = []
    if image_files:
        UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
        existing_count = await db.fetchval(
            "SELECT COUNT(*) FROM product_images WHERE product_id = ?", product_id
        )
        for i, img in enumerate(image_files[:6]):
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
                (existing_count or 0) + i,
            )
        first_img = await db.fetchrow(
            "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order LIMIT 1",
            product_id,
        )
        if first_img:
            await db.execute(
                "UPDATE products SET image_url = ? WHERE id = ?",
                first_img["image_url"],
                product_id,
            )

    row = await db.fetchrow("SELECT * FROM products WHERE id = ?", product_id)
    all_imgs = await db.fetch(
        "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order",
        product_id,
    )
    await bump_version()
    return {
        "item": {
            **dict(row),
            "price": float(row["price"]) if row.get("price") is not None else 0.0,
            "old_price": float(row["old_price"]) if row.get("old_price") else None,
            "is_featured": bool(row.get("is_featured", 0)),
            "is_discount": bool(row.get("is_discount", 0)),
            "images": [i["image_url"] for i in all_imgs],
        }
    }


@router.delete("/products/{product_id}")
async def delete_product(product_id: int):
    existing = await db.fetchrow("SELECT id FROM products WHERE id = ?", product_id)
    if not existing:
        raise HTTPException(404, "Mahsulot topilmadi")

    await db.execute("DELETE FROM products WHERE id = ?", product_id)
    await db.execute("DELETE FROM product_images WHERE product_id = ?", product_id)
    await bump_version()
    return {"ok": True}
