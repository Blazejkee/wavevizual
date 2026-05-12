from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

DB_PATH = Path("/app/storage/wavevizual.db")
_local = threading.local()


def get_db() -> sqlite3.Connection:
    if not hasattr(_local, "conn"):
        _local.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
    return _local.conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            token_balance INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS token_purchases (
            id         TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            tokens     INTEGER NOT NULL,
            price_usd  REAL NOT NULL,
            label      TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS token_usage (
            id         TEXT PRIMARY KEY,
            user_id    TEXT NOT NULL,
            job_id     TEXT NOT NULL,
            tokens     INTEGER NOT NULL,
            quality    TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    conn.commit()
