"""
db.py — SQLite connection manager and schema initializer.
Creates all tables on first run; idempotent on subsequent runs.
"""

import sqlite3
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DATABASE_PATH", "./backend/database/crack_detection.db")


def get_connection() -> sqlite3.Connection:
    """Return a thread-safe SQLite connection with row factory enabled."""
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row          # rows behave like dicts
    conn.execute("PRAGMA journal_mode=WAL") # better concurrent reads
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create all tables if they don't already exist."""
    conn = get_connection()
    cursor = conn.cursor()

    # ── Inspections ─────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inspections (
            id                TEXT PRIMARY KEY,
            timestamp         DATETIME DEFAULT CURRENT_TIMESTAMP,
            original_path     TEXT NOT NULL,
            annotated_path    TEXT,
            crack_detected    INTEGER NOT NULL DEFAULT 0,   -- 0 = No, 1 = Yes
            severity          TEXT NOT NULL DEFAULT 'No Crack',
            confidence        REAL NOT NULL DEFAULT 0.0,
            crack_area_pct    REAL NOT NULL DEFAULT 0.0,
            recommendation    TEXT,
            source            TEXT NOT NULL DEFAULT 'upload',  -- 'upload' | 'camera'
            location_tag      TEXT,                            -- optional GPS / label
            notes             TEXT
        )
    """)

    # ── Audit Logs ──────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            action          TEXT NOT NULL,
            inspection_id   TEXT,
            detail          TEXT,
            timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL
        )
    """)

    # ── Notification Logs ───────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notification_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            inspection_id   TEXT NOT NULL,
            channel         TEXT NOT NULL,   -- 'email' | 'alert'
            status          TEXT NOT NULL,   -- 'sent' | 'failed' | 'skipped'
            message         TEXT,
            timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()
    print("[DB] Database initialized successfully.")


if __name__ == "__main__":
    init_db()
