#!/usr/bin/env python3
"""Exporte prisma/dev.db en INSERT SQL compatibles D1 (données seules, lots < 80 Ko)."""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "prisma" / "dev.db"
OUT_PATH = ROOT / "prisma" / "d1-seed.sql"
MAX_STMT = 80_000

# Ordre respectant les clés étrangères Prisma.
TABLES = [
    "VerificationToken",
    "Firm",
    "User",
    "ValuationMultiple",
    "Portfolio",
    "ContractLine",
    "PortfolioImport",
    "Listing",
    "ListingLine",
    "Valuation",
    "BuyerMandate",
    "Match",
    "Offer",
    "Deal",
    "Document",
    "RetentionReport",
    "Message",
    "Subscription",
    "Notification",
    "AuditLog",
    "DataRoomView",
    "DataRequest",
    "OutboundEmail",
]


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bytes):
        return "X'" + value.hex() + "'"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def dump_table(con: sqlite3.Connection, table: str) -> list[str]:
    cur = con.execute(f'SELECT * FROM "{table}"')
    columns = [d[0] for d in cur.description]
    if not columns:
        return []
    col_sql = ", ".join(f'"{c}"' for c in columns)
    prefix = f'INSERT INTO "{table}" ({col_sql}) VALUES '
    statements: list[str] = []
    batch: list[str] = []
    size = len(prefix)

    def flush() -> None:
        nonlocal batch, size
        if not batch:
            return
        statements.append(prefix + ", ".join(batch) + ";")
        batch = []
        size = len(prefix)

    for row in cur:
        tuple_sql = "(" + ", ".join(sql_literal(v) for v in row) + ")"
        extra = len(tuple_sql) + (2 if batch else 0)
        if batch and size + extra > MAX_STMT:
            flush()
        batch.append(tuple_sql)
        size += extra
    flush()
    return statements


def main() -> int:
    if not DB_PATH.exists():
        print(f"Base locale introuvable : {DB_PATH}", file=sys.stderr)
        return 1
    con = sqlite3.connect(DB_PATH)
    existing = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    parts = ["PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;"]
    for table in TABLES:
        if table not in existing:
            continue
        parts.extend(dump_table(con, table))
    parts.append("COMMIT;")
    parts.append("PRAGMA foreign_keys=ON;")
    OUT_PATH.write_text("\n".join(parts) + "\n", encoding="utf-8")
    print(f"Écrit {OUT_PATH} ({OUT_PATH.stat().st_size} octets)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
