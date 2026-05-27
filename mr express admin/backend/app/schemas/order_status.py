ORDER_STATUSES = frozenset({"confirmed", "active", "arrived", "delivered"})

_LEGACY_STATUS_MAP: dict[str, str] = {
    "confirmed": "confirmed",
    "active": "active",
    "arrived": "arrived",
    "delivered": "delivered",
    "aktiv": "active",
    "processing": "active",
    "pending": "confirmed",
    "tasdiqlandi": "confirmed",
    "jarayonda": "active",
    "on_the_way": "arrived",
    "yo'lda": "arrived",
    "yo_lda": "arrived",
    "in_uzbekistan": "arrived",
    "o'zbekistonda": "arrived",
    "ozbekistonda": "arrived",
    "delivering": "arrived",
    "yetkazilmoqda": "arrived",
    "yetkazildi": "delivered",
    "topshirildi": "delivered",
}

# Reverse map: normalized → list of raw DB values
_STATUS_RAW_VALUES: dict[str, list[str]] = {}
for _raw, _norm in _LEGACY_STATUS_MAP.items():
    _STATUS_RAW_VALUES.setdefault(_norm, []).append(_raw)


def normalize_status(raw: str | None) -> str:
    if not raw:
        return "confirmed"
    key = raw.strip().lower().replace(" ", "_")
    return _LEGACY_STATUS_MAP.get(key, key if key in ORDER_STATUSES else "confirmed")


def raw_values_for(status: str) -> list[str]:
    return _STATUS_RAW_VALUES.get(status, [status])
