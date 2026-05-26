"""MR Express Telegram bot / mini-app SQLite bazasiga ulanish."""

from __future__ import annotations

from pathlib import Path

import aiosqlite

from app.core.config import settings

_db: aiosqlite.Connection | None = None


def _row_dict(row: aiosqlite.Row | None) -> dict | None:
    if row is None:
        return None
    return dict(row)


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        db_path = Path(settings.sqlite_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _db = await aiosqlite.connect(str(db_path))
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA busy_timeout=30000")
        await _db.execute("PRAGMA synchronous=NORMAL")
        try:
            await _migrate(_db)
        except Exception:
            pass
    return _db


async def _migrate(db: aiosqlite.Connection) -> None:
    cur = await db.execute("PRAGMA table_info(categories)")
    cols = {row[1] for row in await cur.fetchall()}
    if "parent_id" not in cols:
        await db.execute(
            "ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id)"
        )

    await db.executescript(
        """
        CREATE TABLE IF NOT EXISTS product_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS banner_products (
            banner_id INTEGER NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            PRIMARY KEY (banner_id, product_id)
        );

        CREATE TABLE IF NOT EXISTS discounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            percent REAL NOT NULL,
            valid_from TEXT,
            valid_to TEXT,
            days_of_week TEXT,
            scope_type TEXT DEFAULT 'all',
            scope_id INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS reels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            video_url TEXT NOT NULL,
            thumbnail_url TEXT,
            product_id INTEGER REFERENCES products(id),
            price REAL,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS group_buys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL REFERENCES products(id),
            required_participants INTEGER NOT NULL,
            current_participants INTEGER DEFAULT 0,
            deadline TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS group_buy_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_buy_id INTEGER NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            joined_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS promocodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discount_percent REAL NOT NULL,
            max_uses INTEGER,
            used_count INTEGER DEFAULT 0,
            expires_at TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS promocode_uses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            promocode_id INTEGER NOT NULL REFERENCES promocodes(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id),
            used_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            product_id INTEGER NOT NULL REFERENCES products(id),
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            content TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now'))
        );
        """
    )

    cur = await db.execute("PRAGMA table_info(users)")
    user_cols = {row[1] for row in await cur.fetchall()}
    if "is_blocked" not in user_cols:
        await db.execute(
            "ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0"
        )

    cur = await db.execute("PRAGMA table_info(reels)")
    reel_cols = {row[1] for row in await cur.fetchall()}
    if reel_cols and "price" not in reel_cols:
        await db.execute("ALTER TABLE reels ADD COLUMN price REAL")

    await _seed_subcategories(db)
    await _seed_catalog_products(db)
    await _seed_admin_samples(db)
    await db.commit()


async def _seed_admin_samples(db: aiosqlite.Connection) -> None:
    """Demo ma'lumotlar — admin modullari bo'sh bo'lsa."""
    review_count = await fetchval("SELECT COUNT(*) FROM reviews")
    if review_count and review_count > 0:
        return

    product = await fetchrow("SELECT id FROM products ORDER BY id LIMIT 1")
    user = await fetchrow("SELECT id FROM users ORDER BY id LIMIT 1")
    if not product or not user:
        return

    pid, uid = product["id"], user["id"]
    await db.executemany(
        """
        INSERT INTO reviews (user_id, product_id, rating, content, status)
        VALUES (?, ?, ?, ?, ?)
        """,
        [
            (uid, pid, 5, "Juda sifatli mahsulot, tavsiya qilaman!", "pending"),
            (uid, pid, 3, "Yaxshi, lekin yetkazish biroz kechikdi.", "pending"),
            (uid, pid, 1, "Spam reklama matni!!!", "pending"),
        ],
    )
    await db.execute(
        """
        INSERT OR IGNORE INTO promocodes (code, discount_percent, max_uses, expires_at, is_active)
        VALUES ('MRX10', 10, 100, datetime('now', '+30 days'), 1)
        """
    )
    await db.execute(
        """
        INSERT INTO discounts (name, percent, valid_from, valid_to, days_of_week, scope_type, is_active)
        VALUES ('Hafta oxiri', 15, datetime('now'), datetime('now', '+90 days'), '[5,6]', 'all', 1)
        """
    )


async def _seed_catalog_products(db: aiosqlite.Connection) -> None:
    """Mini app katalogidagi barcha sub-kategoriyalar uchun mahsulotlar."""
    catalog_items = [
        (1, "Xiaomi Redmi Note 13 telefon", "6.67\" AMOLED smartfon, 128GB", 3290000, None, "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400", 0, 0),
        (1, "Huawei Watch Fit smart soat", "Sport rejimi, yurak urishi monitoringi", 498000, 599000, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", 1, 1),
        (1, "Anker Powerbank 20000mAh", "Tez quvvatlash, 2 USB port", 189000, None, "https://images.unsplash.com/photo-1609091839311-d5365f9ff1e5?w=400", 0, 0),
        (2, "Nike Air oyoq kiyim krossovka", "Yengil va qulay sport poyabzal", 520000, 650000, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", 1, 1),
        (2, "Qishki erkaklar shapka beanie", "Issiq triko shapka", 89000, None, "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400", 0, 0),
        (2, "Ayollar zamonaviy kiyim to'plami", "Kundalik kiyim-kechak seti", 380000, None, "https://images.unsplash.com/photo-1483985988350-763728e3685b?w=400", 0, 0),
        (3, "LED chiroq lampa oshxona", "Sensorli yoritish, energiya tejovchi", 125000, 155000, "https://images.unsplash.com/photo-1565814636192-845e4d4d1b0e?w=400", 0, 1),
        (3, "Uy bezak vaza va gul to'plami", "Zamonaviy interyer bezaklari", 210000, None, "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400", 0, 0),
        (4, "MAC kosmetika makiyaj to'plami", "Lab bo'yog'i va tush seti", 280000, 350000, "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400", 1, 1),
        (4, "Nivea terini parvarish krem", "Namlantiruvchi va himoya kremi", 165000, None, "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400", 0, 0),
    ]
    for cat_id, name, desc, price, old_price, img, featured, discount in catalog_items:
        row = await fetchrow("SELECT id FROM products WHERE name = ?", name)
        if row:
            continue
        await db.execute(
            """
            INSERT INTO products (category_id, name, description, price, old_price, image_url, is_featured, is_discount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (cat_id, name, desc, price, old_price, img, featured, discount),
        )

    search_keywords = [
        ("iPhone 15 Pro", "Apple smartfon telefon, 256GB"),
        ("Samsung Galaxy S24", "Flagman Android smartfon telefon"),
        ("AirPods Pro 2", "Shovqinsiz quloqchin AirPods"),
        ("Erkaklar ko'ylagi", "Premium paxta erkak ko'ylak"),
        ("Ayollar sumkasi", "Zamonaviy ayol sumka kiyim"),
        ("Kofe mashinasi", "Avtomatik espresso kofe mashina oshxona"),
        ("Parfyum to'plami", "3 ta xil hid parfyum"),
    ]
    for pname, pdesc in search_keywords:
        await db.execute(
            "UPDATE products SET description = ? WHERE name = ?",
            (pdesc, pname),
        )


async def _seed_subcategories(db: aiosqlite.Connection) -> None:
    """Asosiy kategoriyalar ostida sub-kategoriyalar (bo'sh bo'lsa)."""
    has_children = await fetchval(
        "SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL"
    )
    if has_children and has_children > 0:
        return

    parents = await fetch("SELECT id, slug FROM categories WHERE parent_id IS NULL")
    subs_by_slug: dict[str, list[tuple[str, str]]] = {
        "elektronika": [("Smartfonlar", "smartfonlar"), ("Noutbuklar", "noutbuklar")],
        "kiyim": [("Erkaklar", "erkaklar"), ("Ayollar", "ayollar")],
        "uy-rozgor": [("Oshxona", "oshxona"), ("Mebel", "mebel")],
        "gozallik": [("Parfyum", "parfyum"), ("Kosmetika", "kosmetika")],
        "oziq-ovqat": [("Mevalar", "mevalar"), ("Ichimliklar", "ichimliklar")],
    }
    for p in parents:
        for i, (name, slug) in enumerate(subs_by_slug.get(p["slug"], []), start=1):
            await db.execute(
                """
                INSERT OR IGNORE INTO categories (name, slug, icon, sort_order, parent_id)
                VALUES (?, ?, '📦', ?, ?)
                """,
                (name, f"{p['slug']}-{slug}", i, p["id"]),
            )


async def fetch(sql: str, *args) -> list[dict]:
    import asyncio as _asyncio
    db = await get_db()
    for attempt in range(10):
        try:
            cur = await db.execute(sql, args)
            rows = await cur.fetchall()
            return [_row_dict(r) for r in rows]
        except Exception as e:
            if "database is locked" in str(e) and attempt < 9:
                await _asyncio.sleep(0.3 * (attempt + 1))
                continue
            raise


async def fetchrow(sql: str, *args) -> dict | None:
    import asyncio as _asyncio
    db = await get_db()
    for attempt in range(10):
        try:
            cur = await db.execute(sql, args)
            row = await cur.fetchone()
            return _row_dict(row)
        except Exception as e:
            if "database is locked" in str(e) and attempt < 9:
                await _asyncio.sleep(0.3 * (attempt + 1))
                continue
            raise


async def fetchval(sql: str, *args):
    row = await fetchrow(sql, *args)
    if row is None:
        return None
    return list(row.values())[0]


async def execute(sql: str, *args) -> int | None:
    import asyncio as _asyncio
    db_path = Path(settings.sqlite_path)
    for attempt in range(8):
        try:
            async with aiosqlite.connect(str(db_path), timeout=30.0) as wdb:
                wdb.row_factory = aiosqlite.Row
                await wdb.execute("PRAGMA journal_mode=WAL")
                await wdb.execute("PRAGMA busy_timeout=30000")
                cur = await wdb.execute(sql, args)
                await wdb.commit()
                return cur.lastrowid
        except Exception as e:
            if "database is locked" in str(e) and attempt < 7:
                await _asyncio.sleep(0.5 * (attempt + 1))
                continue
            raise
