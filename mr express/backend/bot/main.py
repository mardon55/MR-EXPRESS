"""
MR Express Telegram bot — Mini App buyurtmalari (web_app_data) va global xatoliklar.
"""
from __future__ import annotations

import asyncio
import json
import logging
from decimal import Decimal
from typing import Any

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import CommandStart
from aiogram.types import (
    ErrorEvent,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    Message,
    WebAppInfo,
)

from app.config import settings
from app.database import execute, fetch, fetchrow, get_db, get_or_create_user
from bot.uzbekistan_regions import is_valid_location

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=settings.bot_token)
router = Router()
dp = Dispatcher()
dp.include_router(router)

ORDER_REJECT_TEXT = (
    "❌ Buyurtmangiz qabul qilinmadi, ma'lumotlarni qayta tekshiring."
)
ORDER_JSON_INVALID = (
    "❌ Ma'lumotlar noto'g'ri yuborildi. Iltimos, formani qayta to'ldiring."
)
ORDER_STATUS_ACTIVE = "Aktiv"


def _shop_keyboard() -> InlineKeyboardMarkup | None:
    if not settings.webapp_url_valid:
        return None
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Do'konni ochish",
                    web_app=WebAppInfo(url=settings.webapp_url),
                )
            ]
        ]
    )


async def setup_menu_button() -> None:
    if not settings.webapp_url_valid:
        logger.warning(
            "WEBAPP_URL HTTPS emas! BotFather da Mini App URL ni HTTPS qiling."
        )
        return
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="🛍 Do'kon",
            web_app=WebAppInfo(url=settings.webapp_url),
        )
    )
    logger.info("Menu tugmasi o'rnatildi: %s", settings.webapp_url)


def _normalize_phone(phone: str) -> str | None:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) < 9:
        return None
    if digits.startswith("998"):
        return f"+{digits}"
    if len(digits) == 9:
        return f"+998{digits}"
    return f"+{digits}" if phone.strip().startswith("+") else f"+{digits}"


def _parse_web_app_payload(raw: str) -> dict[str, Any] | None:
    """Frontenddan kelgan JSON matnni xavfsiz o'qish."""
    if not raw or not raw.strip():
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("web_app_data: JSON parse xatosi: %s", raw[:500])
        return None
    if not isinstance(data, dict):
        logger.warning("web_app_data: kutilgan dict, olindi %s", type(data).__name__)
        return None
    return data


def _extract_order_fields(data: dict[str, Any]) -> dict[str, Any] | None:
    """Ism, telefon, viloyat, tuman va savat — turli kalit nomlarini qo'llab-quvvatlash."""
    first_name = (
        data.get("firstName")
        or data.get("first_name")
        or data.get("ism")
        or ""
    )
    last_name = (
        data.get("lastName")
        or data.get("last_name")
        or data.get("familiya")
        or ""
    )
    phone = data.get("phone") or data.get("telefon") or ""
    viloyat = data.get("viloyat") or data.get("region") or ""
    tuman = data.get("tuman") or data.get("district") or ""
    items = data.get("items") or data.get("savat") or data.get("cart") or []

    first_name = str(first_name).strip()
    last_name = str(last_name).strip()
    phone = str(phone).strip()
    viloyat = str(viloyat).strip()
    tuman = str(tuman).strip()

    if not first_name or not last_name or not phone or not viloyat or not tuman:
        return None
    if not isinstance(items, list):
        items = []

    return {
        "first_name": first_name,
        "last_name": last_name,
        "phone": phone,
        "viloyat": viloyat,
        "tuman": tuman,
        "items": items,
    }


def _parse_cart_items(items: list[Any]) -> list[dict[str, int]] | None:
    parsed: list[dict[str, int]] = []
    for row in items:
        if not isinstance(row, dict):
            continue
        product_id = row.get("product_id") or row.get("productId") or row.get("id")
        quantity = row.get("quantity") or row.get("qty") or 1
        try:
            pid = int(product_id)
            qty = int(quantity)
        except (TypeError, ValueError):
            continue
        if pid > 0 and qty > 0:
            parsed.append({"product_id": pid, "quantity": qty})
    return parsed if parsed else None


async def _load_cart_from_db(user_id: int) -> list[dict]:
    return await fetch(
        """
        SELECT c.quantity, p.id, p.price, p.stock, p.name
        FROM cart_items c
        JOIN products p ON p.id = c.product_id
        WHERE c.user_id = ?
        """,
        user_id,
    )


async def _resolve_cart_lines(
    db_user_id: int, payload_items: list[Any]
) -> list[dict] | None:
    """Savat: payload bo'lsa undan, aks holda bazadagi savatdan."""
    if payload_items:
        parsed = _parse_cart_items(payload_items)
        if not parsed:
            return None
        lines: list[dict] = []
        for row in parsed:
            product = await fetchrow(
                "SELECT id, price, stock, name FROM products WHERE id = ?",
                row["product_id"],
            )
            if not product:
                logger.warning(
                    "Mahsulot topilmadi: product_id=%s", row["product_id"]
                )
                return None
            if row["quantity"] > product["stock"]:
                logger.warning(
                    "Zaxira yetarli emas: %s (kerak %s, bor %s)",
                    product["name"],
                    row["quantity"],
                    product["stock"],
                )
                return None
            lines.append(
                {
                    "id": product["id"],
                    "quantity": row["quantity"],
                    "price": product["price"],
                    "stock": product["stock"],
                    "name": product["name"],
                }
            )
        return lines

    cart = await _load_cart_from_db(db_user_id)
    return cart if cart else None


async def _save_order(
    db_user_id: int,
    *,
    first_name: str,
    last_name: str,
    phone: str,
    viloyat: str,
    tuman: str,
    cart_lines: list[dict],
) -> int:
    phone_norm = _normalize_phone(phone)
    if not phone_norm:
        raise ValueError("Telefon raqam noto'g'ri")

    address = f"{viloyat}, {tuman} — {first_name} {last_name}"
    total = Decimal("0")
    for item in cart_lines:
        total += Decimal(str(item["price"])) * int(item["quantity"])

    db = await get_db()
    await db.execute("BEGIN IMMEDIATE")
    try:
        cur = await db.execute(
            """
            INSERT INTO orders (user_id, total, address, phone, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (db_user_id, float(total), address, phone_norm, ORDER_STATUS_ACTIVE),
        )
        order_id = cur.lastrowid
        for item in cart_lines:
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
        await db.execute("DELETE FROM cart_items WHERE user_id = ?", (db_user_id,))
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    return int(order_id)


def _format_success_message(
    order_id: int, total: float, viloyat: str, tuman: str
) -> str:
    total_fmt = f"{total:,.0f}".replace(",", " ")
    return (
        "✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n"
        f"📋 Buyurtma raqami: <b>#{order_id}</b>\n"
        f"📍 Manzil: {viloyat}, {tuman}\n"
        f"💰 Jami: <b>{total_fmt} so'm</b>\n"
        f"📌 Holat: <b>{ORDER_STATUS_ACTIVE}</b>\n\n"
        "Tez orada operator siz bilan bog'lanadi."
    )


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    keyboard = _shop_keyboard()
    text = (
        "👋 <b>MR Express</b> ga xush kelibsiz!\n\n"
        "Onlayn do'konimizda mahsulotlarni ko'ring, savatchaga qo'shing va buyurtma bering.\n\n"
    )
    if keyboard:
        text += "Quyidagi tugma yoki pastdagi <b>Menu → Do'kon</b> orqali kiring."
    else:
        text += (
            f"⚠️ Mini App hali sozlanmagan.\n"
            f"Admin: <code>WEBAPP_URL</code> ni HTTPS qiling.\n"
            f"Hozir: {settings.webapp_url}"
        )

    await message.answer(text, reply_markup=keyboard, parse_mode="HTML")


@router.message(F.web_app_data)
async def handle_web_app_data(message: Message) -> None:
    """
    Mini App `Telegram.WebApp.sendData()` → message.web_app_data.data
    """
    if not message.from_user or not message.web_app_data:
        return

    raw = message.web_app_data.data
    payload = _parse_web_app_payload(raw)
    if payload is None:
        await message.answer(ORDER_JSON_INVALID)
        return

    fields = _extract_order_fields(payload)
    if fields is None:
        logger.warning(
            "web_app_data: maydonlar to'liq emas, user_id=%s payload=%s",
            message.from_user.id,
            payload,
        )
        await message.answer(ORDER_REJECT_TEXT)
        return

    if not is_valid_location(fields["viloyat"], fields["tuman"]):
        logger.warning(
            "Viloyat/tuman mos kelmaydi: viloyat=%r tuman=%r user_id=%s",
            fields["viloyat"],
            fields["tuman"],
            message.from_user.id,
        )
        await message.answer(ORDER_REJECT_TEXT)
        return

    telegram_id = message.from_user.id
    try:
        db_user_id = await get_or_create_user(
            telegram_id,
            message.from_user.username,
            message.from_user.first_name,
            message.from_user.last_name,
        )

        cart_lines = await _resolve_cart_lines(db_user_id, fields["items"])
        if not cart_lines:
            logger.warning("Savatcha bo'sh yoki noto'g'ri, user_id=%s", telegram_id)
            await message.answer(ORDER_REJECT_TEXT)
            return

        order_id = await _save_order(
            db_user_id,
            first_name=fields["first_name"],
            last_name=fields["last_name"],
            phone=fields["phone"],
            viloyat=fields["viloyat"],
            tuman=fields["tuman"],
            cart_lines=cart_lines,
        )

        total = sum(
            float(line["price"]) * int(line["quantity"]) for line in cart_lines
        )
        await message.answer(
            _format_success_message(
                order_id, total, fields["viloyat"], fields["tuman"]
            ),
            parse_mode="HTML",
        )
    except ValueError as exc:
        logger.warning("Buyurtma validatsiya: %s", exc)
        await message.answer(ORDER_REJECT_TEXT)
    except Exception:
        logger.exception(
            "Buyurtma saqlashda xato, telegram_id=%s", telegram_id
        )
        await message.answer(ORDER_REJECT_TEXT)


@router.error()
async def global_error_handler(event: ErrorEvent) -> bool:
    """
    Kutilmagan xatolarni ushlab, bot ishlashda davom etadi.
    True qaytarsa — xato qayta ishlangan deb belgilanadi.
    """
    logger.exception(
        "Global error handler: %s",
        event.exception,
        exc_info=event.exception,
    )

    update = event.update
    chat_id: int | None = None
    if update.message and update.message.chat:
        chat_id = update.message.chat.id
    elif update.callback_query and update.callback_query.message:
        chat_id = update.callback_query.message.chat.id

    if chat_id:
        try:
            await bot.send_message(
                chat_id,
                "⚠️ Vaqtinchalik texnik xatolik yuz berdi. "
                "Iltimos, birozdan keyin qayta urinib ko'ring.",
            )
        except Exception:
            logger.exception("Foydalanuvchiga xato xabari yuborilmadi")

    return True


@dp.startup()
async def on_startup() -> None:
    if not settings.bot_token:
        logger.error("BOT_TOKEN .env faylida yo'q!")
        return
    me = await bot.get_me()
    logger.info("Bot: @%s (id=%s)", me.username, me.id)
    await setup_menu_button()
    await get_db()


@dp.shutdown()
async def on_shutdown() -> None:
    from app.database import close_db

    await close_db()


async def main() -> None:
    if not settings.bot_token:
        logger.error("BOT_TOKEN .env faylida ko'rsatilmagan!")
        return
    logger.info("Bot polling boshlanmoqda... WEBAPP_URL=%s", settings.webapp_url)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
