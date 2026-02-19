"""
Tests for SQLite offenders list.
"""

import pytest
from pathlib import Path

from grove_shutter import database
from grove_shutter import config


@pytest.fixture
def temp_db(tmp_path, monkeypatch):
    """Set up a temporary database for testing."""
    # Redirect database path to temp directory
    db_path = tmp_path / "offenders.db"
    monkeypatch.setattr(database, "DB_PATH", db_path)

    # Redirect config dir to temp (needed by ensure_config_dir)
    monkeypatch.setattr(config, "CONFIG_DIR", tmp_path)

    # Initialize the database
    database.init_db()

    return db_path


class TestInitDb:
    """Test suite for database initialization."""

    def test_init_creates_table(self, temp_db):
        """Test that init_db creates the offenders table."""
        import sqlite3

        conn = sqlite3.connect(temp_db)
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='offenders'"
        )
        result = cursor.fetchone()
        conn.close()

        assert result is not None
        assert result[0] == "offenders"

    def test_init_idempotent(self, temp_db):
        """Test that init_db can be called multiple times."""
        # Should not raise
        database.init_db()
        database.init_db()

    def test_table_schema(self, temp_db):
        """Test that table has correct schema."""
        import sqlite3

        conn = sqlite3.connect(temp_db)
        cursor = conn.execute("PRAGMA table_info(offenders)")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        conn.close()

        assert "domain" in columns
        assert "first_seen" in columns
        assert "last_seen" in columns
        assert "detection_count" in columns
        assert "injection_types" in columns


class TestAddOffender:
    """Test suite for add_offender()."""

    def test_add_new_offender(self, temp_db):
        """Test adding a new offender."""
        database.add_offender("malicious.com", "instruction_override")

        offender = database.get_offender("malicious.com")
        assert offender is not None
        assert offender.domain == "malicious.com"
        assert offender.detection_count == 1
        assert "instruction_override" in offender.injection_types

    def test_add_same_domain_increments_count(self, temp_db):
        """Test that adding same domain increments detection_count."""
        database.add_offender("badsite.com", "role_hijack")
        database.add_offender("badsite.com", "role_hijack")
        database.add_offender("badsite.com", "role_hijack")

        offender = database.get_offender("badsite.com")
        assert offender.detection_count == 3

    def test_add_different_injection_types(self, temp_db):
        """Test that different injection types are tracked."""
        database.add_offender("mixed.com", "instruction_override")
        database.add_offender("mixed.com", "role_hijack")
        database.add_offender("mixed.com", "delimiter_injection")

        offender = database.get_offender("mixed.com")
        assert len(offender.injection_types) == 3
        assert "instruction_override" in offender.injection_types
        assert "role_hijack" in offender.injection_types
        assert "delimiter_injection" in offender.injection_types

    def test_duplicate_injection_type_not_added_twice(self, temp_db):
        """Test that same injection type is not duplicated."""
        database.add_offender("repeat.com", "instruction_override")
        database.add_offender("repeat.com", "instruction_override")

        offender = database.get_offender("repeat.com")
        assert offender.injection_types.count("instruction_override") == 1
        assert offender.detection_count == 2  # But count still increases


class TestGetOffender:
    """Test suite for get_offender()."""

    def test_get_existing_offender(self, temp_db):
        """Test retrieving an existing offender."""
        database.add_offender("exists.com", "test_type")

        offender = database.get_offender("exists.com")
        assert offender is not None
        assert offender.domain == "exists.com"

    def test_get_nonexistent_offender(self, temp_db):
        """Test retrieving a non-existent offender returns None."""
        offender = database.get_offender("doesnotexist.com")
        assert offender is None

    def test_get_offender_has_timestamps(self, temp_db):
        """Test that offender has first_seen and last_seen timestamps."""
        database.add_offender("timestamped.com", "test")

        offender = database.get_offender("timestamped.com")
        assert offender.first_seen is not None
        assert offender.last_seen is not None

    def test_last_seen_updates_on_repeat(self, temp_db):
        """Test that last_seen updates when domain is detected again."""
        import time

        database.add_offender("updating.com", "test")
        offender1 = database.get_offender("updating.com")

        time.sleep(0.01)  # Small delay to ensure different timestamp

        database.add_offender("updating.com", "test")
        offender2 = database.get_offender("updating.com")

        assert offender2.last_seen >= offender1.last_seen
        assert offender1.first_seen == offender2.first_seen  # First seen unchanged


class TestListOffenders:
    """Test suite for list_offenders()."""

    def test_list_empty(self, temp_db):
        """Test listing when no offenders exist."""
        offenders = database.list_offenders()
        assert offenders == []

    def test_list_single_offender(self, temp_db):
        """Test listing with one offender."""
        database.add_offender("single.com", "test")

        offenders = database.list_offenders()
        assert len(offenders) == 1
        assert offenders[0].domain == "single.com"

    def test_list_multiple_offenders(self, temp_db):
        """Test listing multiple offenders."""
        database.add_offender("first.com", "test")
        database.add_offender("second.com", "test")
        database.add_offender("third.com", "test")

        offenders = database.list_offenders()
        assert len(offenders) == 3

    def test_list_ordered_by_detection_count(self, temp_db):
        """Test that list is ordered by detection_count descending."""
        database.add_offender("low.com", "test")  # 1 detection

        database.add_offender("high.com", "test")  # 3 detections
        database.add_offender("high.com", "test")
        database.add_offender("high.com", "test")

        database.add_offender("medium.com", "test")  # 2 detections
        database.add_offender("medium.com", "test")

        offenders = database.list_offenders()
        assert offenders[0].domain == "high.com"
        assert offenders[1].domain == "medium.com"
        assert offenders[2].domain == "low.com"


class TestShouldSkipFetch:
    """Test suite for should_skip_fetch() threshold logic."""

    def test_skip_when_threshold_reached(self, temp_db):
        """Test that domain is skipped after 3 detections."""
        database.add_offender("blocked.com", "test", 0.70)
        database.add_offender("blocked.com", "test", 0.70)
        database.add_offender("blocked.com", "test", 0.70)

        assert database.should_skip_fetch("blocked.com") is True

    def test_no_skip_below_threshold(self, temp_db):
        """Test that domain is not skipped below 3 detections with low confidence."""
        # Use low confidence to avoid triggering confidence-based skip
        database.add_offender("allowed.com", "test", 0.65)
        database.add_offender("allowed.com", "test", 0.65)

        assert database.should_skip_fetch("allowed.com") is False

    def test_no_skip_for_unknown_domain(self, temp_db):
        """Test that unknown domains are not skipped."""
        assert database.should_skip_fetch("unknown.com") is False

    def test_exactly_three_triggers_skip(self, temp_db):
        """Test that exactly 3 detections triggers skip (boundary test)."""
        database.add_offender("boundary.com", "test", 0.65)
        assert database.should_skip_fetch("boundary.com") is False

        database.add_offender("boundary.com", "test", 0.65)
        assert database.should_skip_fetch("boundary.com") is False

        database.add_offender("boundary.com", "test", 0.65)
        assert database.should_skip_fetch("boundary.com") is True

    def test_skip_on_very_high_confidence(self, temp_db):
        """Test that single very high confidence detection triggers skip."""
        database.add_offender("dangerous.com", "instruction_override", 0.92)

        # Should skip even with just 1 detection due to high confidence
        assert database.should_skip_fetch("dangerous.com") is True

    def test_skip_on_consistent_high_avg(self, temp_db):
        """Test that consistently high avg confidence with 2+ detections triggers skip."""
        database.add_offender("suspicious.com", "test", 0.85)
        database.add_offender("suspicious.com", "test", 0.85)

        # avg_confidence = 0.85, detection_count = 2
        assert database.should_skip_fetch("suspicious.com") is True

    def test_no_skip_low_avg_two_detections(self, temp_db):
        """Test that low avg confidence with 2 detections doesn't trigger skip."""
        database.add_offender("borderline.com", "test", 0.60)
        database.add_offender("borderline.com", "test", 0.70)

        # avg_confidence = 0.65, detection_count = 2
        # Neither threshold met (avg < 0.80, max < 0.90, count < 3)
        assert database.should_skip_fetch("borderline.com") is False


class TestClearOffenders:
    """Test suite for clear_offenders()."""

    def test_clear_removes_all(self, temp_db):
        """Test that clear_offenders removes all entries."""
        database.add_offender("first.com", "test")
        database.add_offender("second.com", "test")
        database.add_offender("third.com", "test")

        assert len(database.list_offenders()) == 3

        database.clear_offenders()

        assert len(database.list_offenders()) == 0

    def test_clear_empty_database(self, temp_db):
        """Test that clear works on empty database."""
        # Should not raise
        database.clear_offenders()
        assert len(database.list_offenders()) == 0
