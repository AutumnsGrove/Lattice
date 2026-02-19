"""
SQLite offenders list - local persistent storage of domains with detected injections.

All SQL isolated in this file. Application code uses function-based interface.
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from grove_shutter.config import ensure_config_dir
from grove_shutter.models import Offender


DB_PATH = Path.home() / ".shutter" / "offenders.db"


def _get_connection() -> sqlite3.Connection:
    """Get database connection, creating DB if needed."""
    ensure_config_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize offenders database and create tables if needed."""
    conn = _get_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS offenders (
                domain TEXT PRIMARY KEY,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                detection_count INTEGER NOT NULL DEFAULT 1,
                injection_types TEXT NOT NULL,
                avg_confidence REAL NOT NULL DEFAULT 0.0,
                max_confidence REAL NOT NULL DEFAULT 0.0
            )
        """)

        # Migration: add confidence columns if they don't exist (for existing DBs)
        cursor = conn.execute("PRAGMA table_info(offenders)")
        columns = {row[1] for row in cursor.fetchall()}

        if "avg_confidence" not in columns:
            conn.execute("ALTER TABLE offenders ADD COLUMN avg_confidence REAL NOT NULL DEFAULT 0.0")
        if "max_confidence" not in columns:
            conn.execute("ALTER TABLE offenders ADD COLUMN max_confidence REAL NOT NULL DEFAULT 0.0")

        conn.commit()
    finally:
        conn.close()


def add_offender(domain: str, injection_type: str, confidence: float = 1.0) -> None:
    """
    Add or update an offender in the database.

    If domain exists, increments detection_count, updates last_seen,
    and recalculates confidence metrics.
    If new, creates record with detection_count=1.

    Args:
        domain: Domain name (e.g., "malicious.example.com")
        injection_type: Type of injection detected (e.g., "instruction_override")
        confidence: Detection confidence score (0.0-1.0)
    """
    init_db()  # Ensure table exists
    conn = _get_connection()
    now = datetime.now(timezone.utc).isoformat()

    try:
        # Check if domain exists
        cursor = conn.execute(
            "SELECT detection_count, injection_types, avg_confidence, max_confidence FROM offenders WHERE domain = ?",
            (domain,)
        )
        row = cursor.fetchone()

        if row:
            # Update existing record
            detection_count = row["detection_count"] + 1
            existing_types = json.loads(row["injection_types"])
            if injection_type not in existing_types:
                existing_types.append(injection_type)

            # Calculate running average: (old_avg * (n-1) + new_value) / n
            old_avg = row["avg_confidence"] or 0.0
            old_max = row["max_confidence"] or 0.0
            new_avg = ((old_avg * (detection_count - 1)) + confidence) / detection_count
            new_max = max(old_max, confidence)

            conn.execute(
                """
                UPDATE offenders
                SET last_seen = ?, detection_count = ?, injection_types = ?,
                    avg_confidence = ?, max_confidence = ?
                WHERE domain = ?
                """,
                (now, detection_count, json.dumps(existing_types), new_avg, new_max, domain)
            )
        else:
            # Insert new record
            conn.execute(
                """
                INSERT INTO offenders (domain, first_seen, last_seen, detection_count, injection_types, avg_confidence, max_confidence)
                VALUES (?, ?, ?, 1, ?, ?, ?)
                """,
                (domain, now, now, json.dumps([injection_type]), confidence, confidence)
            )

        conn.commit()
    finally:
        conn.close()


def get_offender(domain: str) -> Optional[Offender]:
    """
    Retrieve offender record by domain.

    Args:
        domain: Domain name to look up

    Returns:
        Offender dataclass or None if not found
    """
    init_db()
    conn = _get_connection()

    try:
        cursor = conn.execute(
            "SELECT * FROM offenders WHERE domain = ?",
            (domain,)
        )
        row = cursor.fetchone()

        if row:
            return Offender(
                domain=row["domain"],
                first_seen=datetime.fromisoformat(row["first_seen"]),
                last_seen=datetime.fromisoformat(row["last_seen"]),
                detection_count=row["detection_count"],
                injection_types=json.loads(row["injection_types"]),
                avg_confidence=row["avg_confidence"] or 0.0,
                max_confidence=row["max_confidence"] or 0.0,
            )
        return None
    finally:
        conn.close()


def list_offenders() -> List[Offender]:
    """
    List all offenders in database.

    Returns:
        List of Offender dataclasses, ordered by detection_count descending
    """
    init_db()
    conn = _get_connection()

    try:
        cursor = conn.execute(
            "SELECT * FROM offenders ORDER BY detection_count DESC"
        )
        rows = cursor.fetchall()

        return [
            Offender(
                domain=row["domain"],
                first_seen=datetime.fromisoformat(row["first_seen"]),
                last_seen=datetime.fromisoformat(row["last_seen"]),
                detection_count=row["detection_count"],
                injection_types=json.loads(row["injection_types"]),
                avg_confidence=row["avg_confidence"] or 0.0,
                max_confidence=row["max_confidence"] or 0.0,
            )
            for row in rows
        ]
    finally:
        conn.close()


def should_skip_fetch(domain: str) -> bool:
    """
    Check if domain should be skipped entirely based on detection history.

    Skip criteria (any of):
    - detection_count >= 3 (original threshold)
    - max_confidence >= 0.90 (single very high-confidence detection)
    - avg_confidence >= 0.80 AND detection_count >= 2 (consistently suspicious)

    Args:
        domain: Domain name to check

    Returns:
        True if domain should be skipped
    """
    offender = get_offender(domain)
    if offender is None:
        return False

    # Original count-based threshold
    if offender.detection_count >= 3:
        return True

    # Single very high-confidence detection
    if offender.max_confidence >= 0.90:
        return True

    # Consistently suspicious pattern
    if offender.avg_confidence >= 0.80 and offender.detection_count >= 2:
        return True

    return False


def clear_offenders() -> None:
    """
    Clear all offenders from database.

    Useful for testing or resetting the offenders list.
    """
    init_db()
    conn = _get_connection()

    try:
        conn.execute("DELETE FROM offenders")
        conn.commit()
    finally:
        conn.close()
