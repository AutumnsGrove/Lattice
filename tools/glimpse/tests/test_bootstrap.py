"""Tests for glimpse.seed.bootstrap — migration SQL patching."""

from glimpse.seed.bootstrap import _patch_migration_sql


class TestPatchMigrationSql:
    def test_patches_alter_table_unixepoch(self):
        sql = "ALTER TABLE tenants ADD COLUMN trial_ends_at INTEGER DEFAULT (unixepoch())"
        result = _patch_migration_sql(sql)
        assert "DEFAULT 0" in result
        assert "unixepoch" not in result

    def test_preserves_create_table_unixepoch(self):
        """CREATE TABLE with unixepoch() should not be patched (it's valid)."""
        sql = "CREATE TABLE foo (created_at INTEGER DEFAULT (unixepoch()))"
        result = _patch_migration_sql(sql)
        assert result == sql  # No change

    def test_preserves_normal_alter_table(self):
        sql = "ALTER TABLE tenants ADD COLUMN name TEXT DEFAULT ''"
        result = _patch_migration_sql(sql)
        assert result == sql  # No change

    def test_case_insensitive(self):
        sql = "alter table TENANTS add column trial_ends_at INTEGER DEFAULT (UNIXEPOCH())"
        result = _patch_migration_sql(sql)
        assert "DEFAULT 0" in result

    def test_multiple_statements(self):
        sql = (
            "ALTER TABLE tenants ADD COLUMN a INTEGER DEFAULT (unixepoch());\n"
            "ALTER TABLE users ADD COLUMN b INTEGER DEFAULT (unixepoch());\n"
        )
        result = _patch_migration_sql(sql)
        assert result.count("DEFAULT 0") == 2
        assert "unixepoch" not in result

    def test_empty_string(self):
        assert _patch_migration_sql("") == ""

    def test_mixed_statements(self):
        sql = (
            "ALTER TABLE t ADD COLUMN a TEXT DEFAULT 'hello';\n"
            "ALTER TABLE t ADD COLUMN b INTEGER DEFAULT (unixepoch());\n"
            "CREATE INDEX idx_t_b ON t(b);\n"
        )
        result = _patch_migration_sql(sql)
        assert "DEFAULT 'hello'" in result  # Unchanged
        assert "DEFAULT 0" in result  # Patched
        assert "CREATE INDEX" in result  # Unchanged
