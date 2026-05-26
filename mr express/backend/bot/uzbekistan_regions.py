"""O'zbekiston viloyatlari va tumanlari (frontend bilan mos)."""
import json
from pathlib import Path

_PATH = Path(__file__).resolve().parent / "regions.json"
with _PATH.open(encoding="utf-8") as f:
    UZBEKISTAN_REGIONS: dict[str, list[str]] = json.load(f)

REGION_NAMES: list[str] = list(UZBEKISTAN_REGIONS.keys())


def get_districts_by_region(region_name: str) -> list[str]:
    return list(UZBEKISTAN_REGIONS.get(region_name, []))


def is_valid_location(viloyat: str, tuman: str) -> bool:
    districts = UZBEKISTAN_REGIONS.get(viloyat)
    if not districts:
        return False
    return tuman in districts
