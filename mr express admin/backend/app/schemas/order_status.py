ORDER_STATUSES = frozenset({"pending", "confirmed", "active", "arrived", "delivered"})

_LEGACY_STATUS_MAP: dict[str, str] = {
    "pending":         "pending",
    "new":             "pending",
    "yangi":           "pending",
    "confirmed":       "confirmed",
    "tasdiqlandi":     "confirmed",
    "active":          "active",
    "aktiv":           "active",
    "processing":      "active",
    "jarayonda":       "active",
    "arrived":         "arrived",
    "on_the_way":      "arrived",
    "yo'lda":          "arrived",
    "yo_lda":          "arrived",
    "in_uzbekistan":   "arrived",
    "o'zbekistonda":   "arrived",
    "ozbekistonda":    "arrived",
    "delivering":      "arrived",
    "yetkazilmoqda":   "arrived",
    "yetkazildi":      "delivered",
    "topshirildi":     "delivered",
    "delivered":       "delivered",
}

_STATUS_RAW_VALUES: dict[str, list[str]] = {}
for _raw, _norm in _LEGACY_STATUS_MAP.items():
    _STATUS_RAW_VALUES.setdefault(_norm, []).append(_raw)


def normalize_status(raw: str | None) -> str:
    if not raw:
        return "pending"
    key = raw.strip().lower().replace(" ", "_")
    return _LEGACY_STATUS_MAP.get(key, key if key in ORDER_STATUSES else "pending")


def raw_values_for(status: str) -> list[str]:
    return _STATUS_RAW_VALUES.get(status, [status])
