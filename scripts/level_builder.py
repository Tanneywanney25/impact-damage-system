#!/usr/bin/env python3
"""Build Slingshot Siege level JSON from simple text layouts.

Layout format (see scripts/layouts/*.txt):

    name: First Contact
    birds: 3
    cell: 44
    origin: 760 456
    ---
    .P.
    BLB

Header keys, then `---`, then a character grid drawn top-down:
  B = box (cell x cell)         P = pig (radius 0.45*cell)
  L = log segment — consecutive L's in a row merge into one horizontal log
  . = empty

`origin` is the left edge x and the GROUND-surface y; the grid's bottom row
sits on the ground. Output matches src/systems/levels.ts (parseLevel).

Usage:
    python scripts/level_builder.py scripts/layouts/level1.txt public/levels/level1.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

LOG_HEIGHT_FACTOR = 0.3


def build(text: str) -> dict:
    header, _, grid_text = text.partition("---")
    meta: dict[str, str] = {}
    for line in header.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()

    name = meta.get("name")
    if not name:
        raise ValueError("layout: missing name")
    birds = int(meta.get("birds", "3"))
    cell = float(meta.get("cell", "44"))
    origin = meta.get("origin", "760 456").split()
    ox, ground_y = float(origin[0]), float(origin[1])

    rows = [r.rstrip("\n") for r in grid_text.strip("\n").splitlines() if r.strip()]
    n_rows = len(rows)
    if n_rows == 0:
        raise ValueError("layout: empty grid")

    blocks: list[dict] = []
    pigs: list[dict] = []

    def cy(row: int) -> float:
        """Center y of a cell in `row` (row 0 = top of the grid)."""
        return ground_y - (n_rows - row - 0.5) * cell

    for r, row in enumerate(rows):
        c = 0
        while c < len(row):
            ch = row[c]
            if ch == "B":
                blocks.append(
                    {
                        "type": "box",
                        "x": ox + (c + 0.5) * cell,
                        "y": cy(r),
                        "w": cell,
                        "h": cell,
                    }
                )
                c += 1
            elif ch == "L":
                run = 1
                while c + run < len(row) and row[c + run] == "L":
                    run += 1
                blocks.append(
                    {
                        "type": "log",
                        "x": ox + (c + run / 2) * cell,
                        "y": ground_y - (n_rows - r - 1) * cell - (cell * LOG_HEIGHT_FACTOR) / 2,
                        "w": run * cell,
                        "h": cell * LOG_HEIGHT_FACTOR,
                    }
                )
                c += run
            elif ch == "P":
                pigs.append({"x": ox + (c + 0.5) * cell, "y": cy(r), "r": cell * 0.45})
                c += 1
            else:
                c += 1

    if not pigs:
        raise ValueError("layout: needs at least one pig")

    return {"name": name, "birds": birds, "blocks": blocks, "pigs": pigs}


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        raise SystemExit(2)
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    level = build(src.read_text(encoding="utf-8"))
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(level, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {dst}: {level['name']} ({len(level['blocks'])} blocks, {len(level['pigs'])} pigs)")


if __name__ == "__main__":
    main()
