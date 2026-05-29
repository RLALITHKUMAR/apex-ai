"""
models.py — SQLite query helpers (ORM-style wrappers).
"""

import uuid
from datetime import datetime
from .db import get_connection


def create_inspection(data: dict) -> str:
    """Insert a new inspection record. Returns the new inspection ID."""
    inspection_id = str(uuid.uuid4())[:12].replace("-", "")
    conn = get_connection()
    conn.execute("""
        INSERT INTO inspections
        (id, original_path, annotated_path, crack_detected, severity,
         confidence, crack_area_pct, recommendation, source, location_tag, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, (
        inspection_id,
        data.get("original_path", ""),
        data.get("annotated_path", ""),
        1 if data.get("crack_detected") else 0,
        data.get("severity", "No Crack"),
        data.get("confidence", 0.0),
        data.get("crack_area_pct", 0.0),
        data.get("recommendation", ""),
        data.get("source", "upload"),
        data.get("location_tag", ""),
        data.get("notes", ""),
    ))
    conn.commit()
    conn.close()
    return inspection_id


def get_inspection(inspection_id: str) -> dict | None:
    """Fetch a single inspection by ID."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM inspections WHERE id = ?", (inspection_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_inspections(limit: int = 100, offset: int = 0) -> list[dict]:
    """Fetch all inspections ordered by newest first."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM inspections ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        (limit, offset)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_inspection(inspection_id: str) -> bool:
    """Delete an inspection record. Returns True if deleted."""
    conn = get_connection()
    cursor = conn.execute(
        "DELETE FROM inspections WHERE id = ?", (inspection_id,)
    )
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def get_statistics() -> dict:
    """Return aggregate stats for the dashboard."""
    conn = get_connection()
    total     = conn.execute("SELECT COUNT(*) FROM inspections").fetchone()[0]
    cracked   = conn.execute("SELECT COUNT(*) FROM inspections WHERE crack_detected=1").fetchone()[0]
    by_sev    = conn.execute(
        "SELECT severity, COUNT(*) as cnt FROM inspections GROUP BY severity"
    ).fetchall()
    conn.close()
    return {
        "total": total,
        "cracked": cracked,
        "clean": total - cracked,
        "by_severity": {row["severity"]: row["cnt"] for row in by_sev},
    }


def log_audit(action: str, inspection_id: str = None, detail: str = ""):
    conn = get_connection()
    conn.execute(
        "INSERT INTO audit_logs (action, inspection_id, detail) VALUES (?,?,?)",
        (action, inspection_id, detail)
    )
    conn.commit()
    conn.close()
