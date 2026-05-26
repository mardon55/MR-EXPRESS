from pathlib import Path

import aiosqlite

from app.config import settings

_db: aiosqlite.Connection | None = None


def _row_dict(row: aiosqlite.Row | None) -> dict | None:
    if row is None:
        return None
    return dict(row)


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
        _db = await aiosqlite.connect(settings.sqlite_path)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA busy_timeout=10000")
        await _init_schema(_db)
    return _db


async def _migrate_schema(db: aiosqlite.Connection):
    cur = await db.execute("PRAGMA table_info(users)")
    cols = {row[1] for row in await cur.fetchall()}
    if "is_registered" not in cols:
        await db.execute(
            "ALTER TABLE users ADD COLUMN is_registered INTEGER DEFAULT 0"
        )

    # stories jadvalida media_type ustuni bo'lmasa qo'shish
    cur = await db.execute("PRAGMA table_info(stories)")
    story_cols = {row[1] for row in await cur.fetchall()}
    if story_cols and "media_type" not in story_cols:
        await db.execute(
            "ALTER TABLE stories ADD COLUMN media_type TEXT DEFAULT 'image'"
        )

    # payment_settings jadvali
    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            card_number TEXT DEFAULT '',
            card_holder TEXT DEFAULT '',
            bank_name TEXT DEFAULT '',
            updated_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    await db.execute(
        "INSERT OR IGNORE INTO payment_settings (id) VALUES (1)"
    )

    # reviews jadvali mavjudligini tekshirish (eski bazalar uchun)
    cur = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'"
    )
    if not await cur.fetchone():
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                comment TEXT,
                photos TEXT DEFAULT '[]',
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE (product_id, user_id)
            )
            """
        )
    else:
        # Eski reviews jadvalida photos ustuni bo'lmasa qo'shish
        cur = await db.execute("PRAGMA table_info(reviews)")
        review_cols = {row[1] for row in await cur.fetchall()}
        if "photos" not in review_cols:
            await db.execute(
                "ALTER TABLE reviews ADD COLUMN photos TEXT DEFAULT '[]'"
            )


async def _init_schema(db: aiosqlite.Connection):
    schema_path = Path(__file__).resolve().parent.parent / "database" / "init_sqlite.sql"
    await db.executescript(schema_path.read_text(encoding="utf-8"))
    await _migrate_schema(db)
    cat_count = await fetchval("SELECT COUNT(*) FROM categories")
    if cat_count == 0:
        await _seed(db)
    else:
        # Kategoriyalar bor bo'lsa ham bannerlarni alohida seed qilamiz
        banner_count = await fetchval("SELECT COUNT(*) FROM banners")
        if banner_count == 0:
            await _seed_banners(db)
    await _seed_catalog_products(db)
    await db.commit()


async def _seed_banners(db: aiosqlite.Connection):
    banners = [
        ("Yozgi chegirmalar", "50% gacha chegirma", "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800", 1),
        ("Yangi mahsulotlar", "Eng so'nggi modellar", "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800", 2),
        ("Bepul yetkazib berish", "100 000 so'mdan yuqori buyurtmalarda", "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800", 3),
    ]
    await db.executemany(
        "INSERT INTO banners (title, subtitle, image_url, sort_order) VALUES (?, ?, ?, ?)",
        banners,
    )


async def _seed(db: aiosqlite.Connection):
    main_cats = [
        (1, "Elektronika",   "elektronika",  "📱", 1),
        (2, "Kiyimlar",      "kiyimlar",     "👗", 2),
        (3, "Uy Ro'zg'or",  "uy-rozgor",    "🏠", 3),
        (4, "Go'zallik",     "gozallik",     "💄", 4),
        (5, "O'yinchoqlar",  "oyinchoqlar",  "🧸", 5),
    ]
    await db.executemany(
        "INSERT INTO categories (id, name, slug, icon, sort_order) VALUES (?, ?, ?, ?, ?)",
        main_cats,
    )
    sub_cats = [
        ("Smartfonlar",                    "smartfonlar",         "📱", 1, 1),
        ("Aksessuarlar",                   "aksessuarlar",        "🎧", 2, 1),
        ("G'iloflar",                      "giloflar",            "🛡️", 3, 1),
        ("Himoya oynalar",                 "himoya-oynalar",      "🪟", 4, 1),
        ("Quvvatlagichlar",                "quvvatlagichlar",     "🔋", 5, 1),
        ("Erkaklar kiyimi",                "erkaklar-kiyimi",     "👔", 1, 2),
        ("Ayollar kiyimi",                 "ayollar-kiyimi",      "👚", 2, 2),
        ("Bolalar kiyimi",                 "bolalar-kiyimi",      "🧒", 3, 2),
        ("Sport kiyimlari",                "sport-kiyimlari",     "🏃", 4, 2),
        ("Oyoq kiyimlar",                  "oyoq-kiyimlar",       "👟", 5, 2),
        ("Oshxona jihozlari",              "oshxona-jihozlari",   "🍳", 1, 3),
        ("Maishiy texnika",                "maishiy-texnika",     "🏠", 2, 3),
        ("Uy tekstili",                    "uy-tekstili",         "🛏️", 3, 3),
        ("Mebel va interyer",              "mebel-va-interyer",   "🪑", 4, 3),
        ("Yuz va tana parvarishi",         "yuz-va-tana",         "🧴", 1, 4),
        ("Dekorativ kosmetika",            "dekorativ-kosmetika", "💋", 2, 4),
        ("Soch parvarishi",                "soch-parvarishi",     "💇", 3, 4),
        ("Parfyumeriya",                   "parfyumeriya",        "🌸", 4, 4),
        ("Manikyur va pedikyur",           "manikyur-pedikyur",   "💅", 5, 4),
        ("Rivojlantiruvchi o'yinchoqlar",  "rivojlantiruvchi",    "🎓", 1, 5),
        ("Konstruktorlar",                 "konstruktorlar",      "🧱", 2, 5),
        ("Yumshoq o'yinchoqlar",           "yumshoq-oyinchoqlar", "🧸", 3, 5),
        ("Radioboshqaruvli va interaktiv", "radio-interaktiv",    "🎮", 4, 5),
        ("Stol o'yinlari",                 "stol-oyinlari",       "🎲", 5, 5),
    ]
    await db.executemany(
        "INSERT INTO categories (name, slug, icon, sort_order, parent_id) VALUES (?, ?, ?, ?, ?)",
        sub_cats,
    )
    banners = [
        ("Yozgi chegirmalar", "50% gacha", "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800", 1),
        ("Yangi mahsulotlar", "Eng so'nggi modellar", "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800", 2),
        ("Bepul yetkazib berish", "100 000 so'mdan yuqori", "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800", 3),
    ]
    await db.executemany(
        "INSERT INTO banners (title, subtitle, image_url, sort_order) VALUES (?, ?, ?, ?)",
        banners,
    )
    products = [
        (1, "iPhone 15 Pro", "Apple smartfon, 256GB", 14990000, 16990000, "https://images.unsplash.com/photo-1695048133142-7a3cb3c8a5c6?w=400", 1, 1),
        (1, "Samsung Galaxy S24", "Flagman Android telefon", 11990000, None, "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400", 1, 0),
        (1, "AirPods Pro 2", "Shovqinsiz quloqchinlar", 2890000, 3290000, "https://images.unsplash.com/photo-1606220945770-bfed9a6e0b0d?w=400", 1, 1),
        (2, "Erkaklar ko'ylagi", "Premium paxta", 299000, 399000, "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400", 0, 1),
        (2, "Ayollar sumkasi", "Zamonaviy dizayn", 450000, None, "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400", 0, 0),
        (3, "Kofe mashinasi", "Avtomatik espresso", 1890000, 2190000, "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400", 1, 1),
        (4, "Parfyum to'plami", "3 ta xil hid", 350000, 450000, "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400", 0, 1),
        (5, "Organik mevalar", "1 kg to'plam", 89000, None, "https://images.unsplash.com/photo-1610832951502-9d8b3ce3f5e2?w=400", 0, 0),
    ]
    await db.executemany(
        """INSERT INTO products (category_id, name, description, price, old_price, image_url, is_featured, is_discount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        products,
    )


async def _seed_catalog_products(db: aiosqlite.Connection) -> None:
    """Mini app katalogidagi barcha sub-kategoriyalar uchun mahsulotlar (qidiruv bo'yicha)."""
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
        exists = await db.execute(
            "SELECT 1 FROM products WHERE name = ? LIMIT 1",
            (name,),
        )
        if await exists.fetchone():
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


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None


async def fetch(sql: str, *args):
    db = await get_db()
    cur = await db.execute(sql, args)
    rows = await cur.fetchall()
    return [_row_dict(r) for r in rows]


async def fetchrow(sql: str, *args) -> dict | None:
    db = await get_db()
    cur = await db.execute(sql, args)
    row = await cur.fetchone()
    return _row_dict(row)


async def fetchval(sql: str, *args):
    row = await fetchrow(sql, *args)
    if row is None:
        return None
    return list(row.values())[0]


async def execute(sql: str, *args):
    db = await get_db()
    await db.execute(sql, args)
    await db.commit()


async def get_or_create_user(
    telegram_id: int,
    username: str | None,
    first_name: str | None,
    last_name: str | None,
) -> int:
    # Separate write connection to avoid cursor-in-progress conflicts
    db_path = Path(settings.sqlite_path)
    import aiosqlite as _aiosqlite
    async with _aiosqlite.connect(str(db_path), timeout=30.0) as wdb:
        wdb.row_factory = _aiosqlite.Row
        await wdb.execute("PRAGMA journal_mode=WAL")
        await wdb.execute("PRAGMA busy_timeout=30000")
        cur = await wdb.execute(
            """
            INSERT INTO users (telegram_id, username, first_name, last_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (telegram_id) DO UPDATE SET
                username = excluded.username,
                first_name = CASE
                    WHEN users.is_registered = 1 THEN users.first_name
                    ELSE COALESCE(excluded.first_name, users.first_name)
                END,
                last_name = CASE
                    WHEN users.is_registered = 1 THEN users.last_name
                    ELSE COALESCE(excluded.last_name, users.last_name)
                END
            RETURNING id
            """,
            (telegram_id, username, first_name, last_name),
        )
        row = await cur.fetchone()
        await wdb.commit()
    return dict(row)["id"]
