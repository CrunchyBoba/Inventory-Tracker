#!/usr/bin/env python3
"""Convert the original closing-inventory CSV into the app's clean baseline.

Usage:
    python3 scripts/clean_inventory.py \
      "/path/to/Closing Inventory 2026.xlsx - Sheet1.csv"

The generated `data/inventory.json` is the base inventory. Annual adjustments
belong in `data/changes.json`, rather than modifying this file by hand.
"""

import csv
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "inventory.json"

# These rows organize the spreadsheet but are not inventory items.
SECTION_HEADERS = {
    "Boat Equipment",
    "Chase Boat",
    "General Items/stuff",
    "Race Equipment",
    "Tools",
    "Other",
}


def solid_amount(value: str) -> int:
    """Turn source quantities such as `≈ 1`, `1+3`, and `6,6` into integers."""
    parts = re.findall(r"\d+", value or "")
    return sum(map(int, parts)) if parts else 0


def clean_location(value: str) -> str:
    return value.strip() or "Annex"


def clean(source: Path) -> list[dict]:
    with source.open(newline="", encoding="utf-8-sig") as handle:
        # First row is only the report title; the second holds the actual headers.
        next(handle, None)
        rows = list(csv.DictReader(handle))

    items = []
    for row in rows:
        name = (row.get("Item") or "").strip()
        amount_text = (row.get("Amount") or "").strip()
        location = (row.get("Location") or "").strip()
        notes = (row.get("Notes") or "").strip()

        # The original top-level "Boats" heading becomes the requested fleet item.
        if name == "Boats":
            items.append({
                "id": "boats",
                "name": "Boats",
                "amount": 17,
                "location": "Annex",
                "notes": "12 Simons, 4 Swifts, 1 Wooden",
            })
            continue

        # Remove blank rows and category-only headings.
        if not name or (not amount_text and not location and not notes):
            continue
        if name in SECTION_HEADERS:
            continue

        amount = solid_amount(amount_text)
        if not amount_text:
            notes = (notes + "; " if notes else "") + "No count supplied in original inventory"

        items.append({
            "id": f"item-{len(items) + 1:03d}",
            "name": re.sub(r"\s+", " ", name),
            "amount": amount,
            "location": clean_location(location),
            "notes": notes,
        })
    return items


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "source.csv"
    items = clean(source)
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps({
        "source": source.name,
        "created": str(date.today()),
        "items": items,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} items to {OUTPUT}")


if __name__ == "__main__":
    main()
