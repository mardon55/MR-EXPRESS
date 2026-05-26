ORDER_STATUSES = frozenset(
    {
        "confirmed",
        "processing",
        "on_the_way",
        "in_uzbekistan",
        "delivering",
        "delivered",
    }
)

_LEGACY_STATUS_MAP = {
    "aktiv": "processing",
    "pending": "confirmed",
    "tasdiqlandi": "confirmed",
    "jarayonda": "processing",
    "yo'lda": "on_the_way",
    "yo_lda": "on_the_way",
    "o'zbekistonda": "in_uzbekistan",
    "ozbekistonda": "in_uzbekistan",
    "yetkazilmoqda": "delivering",
    "yetkazildi": "delivered",
    "topshirildi": "delivered",
    "delivered": "delivered",
    "processing": "processing",
    "confirmed": "confirmed",
    "delivering": "delivering",
}


def normalize_status(raw: str | None) -> str:
    if not raw:
        return "confirmed"
    key = raw.strip().lower().replace(" ", "_")
    return _LEGACY_STATUS_MAP.get(key, key if key in ORDER_STATUSES else "processing")
