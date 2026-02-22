"""Tests for the database safety layer."""

import pytest

from gw.safety import (
    AGENT_SAFE_CONFIG,
    ErrorCode,
    SafetyConfig,
    SafetyViolationError,
    extract_table_name,
    get_operation_type,
    validate_sql,
)
from gw.safety.database import _estimate_rows


class TestOperationType:
    """Tests for operation type detection."""

    def test_select_operation(self) -> None:
        """Test SELECT operation detection."""
        assert get_operation_type("SELECT * FROM users") == "SELECT"
        assert get_operation_type("  SELECT id FROM posts") == "SELECT"

    def test_insert_operation(self) -> None:
        """Test INSERT operation detection."""
        assert (
            get_operation_type("INSERT INTO users (name) VALUES ('test')") == "INSERT"
        )

    def test_update_operation(self) -> None:
        """Test UPDATE operation detection."""
        assert get_operation_type("UPDATE users SET name = 'test'") == "UPDATE"

    def test_delete_operation(self) -> None:
        """Test DELETE operation detection."""
        assert get_operation_type("DELETE FROM users") == "DELETE"

    def test_ddl_operations(self) -> None:
        """Test DDL operation detection."""
        assert get_operation_type("CREATE TABLE users (id INT)") == "CREATE"
        assert get_operation_type("DROP TABLE users") == "DROP"
        assert get_operation_type("ALTER TABLE users ADD COLUMN email TEXT") == "ALTER"
        assert get_operation_type("TRUNCATE TABLE users") == "TRUNCATE"


class TestTableNameExtraction:
    """Tests for table name extraction."""

    def test_extract_from_select(self) -> None:
        """Test extracting table name from SELECT."""
        assert extract_table_name("SELECT * FROM users") == "users"
        assert extract_table_name("SELECT id FROM posts WHERE id = 1") == "posts"

    def test_extract_from_update(self) -> None:
        """Test extracting table name from UPDATE."""
        assert extract_table_name("UPDATE users SET name = 'test'") == "users"

    def test_extract_from_delete(self) -> None:
        """Test extracting table name from DELETE."""
        assert extract_table_name("DELETE FROM users WHERE id = 1") == "users"

    def test_extract_with_backticks(self) -> None:
        """Test extracting table name with backticks."""
        assert extract_table_name("SELECT * FROM `users`") == "users"


class TestDDLBlocking:
    """Tests for DDL operation blocking."""

    def test_block_create(self) -> None:
        """Test CREATE is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("CREATE TABLE users (id INT)", config)
        assert exc_info.value.code == ErrorCode.DDL_BLOCKED

    def test_block_drop(self) -> None:
        """Test DROP is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("DROP TABLE users", config)
        assert exc_info.value.code == ErrorCode.DDL_BLOCKED

    def test_block_alter(self) -> None:
        """Test ALTER is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("ALTER TABLE users ADD COLUMN email TEXT", config)
        assert exc_info.value.code == ErrorCode.DDL_BLOCKED

    def test_block_truncate(self) -> None:
        """Test TRUNCATE is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("TRUNCATE TABLE users", config)
        assert exc_info.value.code == ErrorCode.DDL_BLOCKED


class TestDangerousPatterns:
    """Tests for dangerous pattern detection."""

    def test_stacked_queries(self) -> None:
        """Test detection of stacked queries."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("SELECT * FROM users; DROP TABLE users", config)
        assert exc_info.value.code == ErrorCode.DANGEROUS_PATTERN

    def test_comment_injection(self) -> None:
        """Test detection of SQL comments."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("SELECT * FROM users -- comment", config)
        assert exc_info.value.code == ErrorCode.DANGEROUS_PATTERN

    def test_block_comment(self) -> None:
        """Test detection of block comments."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("SELECT * FROM users /* comment */", config)
        assert exc_info.value.code == ErrorCode.DANGEROUS_PATTERN


class TestMissingWhereClause:
    """Tests for missing WHERE clause detection."""

    def test_delete_without_where(self) -> None:
        """Test DELETE without WHERE is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("DELETE FROM users", config)
        assert exc_info.value.code == ErrorCode.MISSING_WHERE

    def test_update_without_where(self) -> None:
        """Test UPDATE without WHERE is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("UPDATE users SET name = 'test'", config)
        assert exc_info.value.code == ErrorCode.MISSING_WHERE

    def test_delete_with_where_allowed(self) -> None:
        """Test DELETE with WHERE is allowed."""
        config = SafetyConfig()
        # Should not raise
        validate_sql("DELETE FROM posts WHERE id = 1", config)

    def test_update_with_where_allowed(self) -> None:
        """Test UPDATE with WHERE is allowed."""
        config = SafetyConfig()
        # Should not raise
        validate_sql("UPDATE posts SET title = 'test' WHERE id = 1", config)


class TestProtectedTables:
    """Tests for protected table detection."""

    def test_protected_table_delete(self) -> None:
        """Test DELETE on protected table is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("DELETE FROM users WHERE id = 1", config)
        assert exc_info.value.code == ErrorCode.PROTECTED_TABLE

    def test_protected_table_update(self) -> None:
        """Test UPDATE on protected table is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("UPDATE users SET name = 'test' WHERE id = 1", config)
        assert exc_info.value.code == ErrorCode.PROTECTED_TABLE

    def test_protected_table_insert(self) -> None:
        """Test INSERT on protected table is blocked."""
        config = SafetyConfig()
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("INSERT INTO users (name) VALUES ('test')", config)
        assert exc_info.value.code == ErrorCode.PROTECTED_TABLE

    def test_custom_protected_tables(self) -> None:
        """Test custom protected tables."""
        config = SafetyConfig(protected_tables=["admin_users"])
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("DELETE FROM admin_users WHERE id = 1", config)
        assert exc_info.value.code == ErrorCode.PROTECTED_TABLE

    def test_unprotected_table_allowed(self) -> None:
        """Test unprotected table operations are allowed."""
        config = SafetyConfig()
        # Should not raise
        validate_sql("DELETE FROM posts WHERE id = 1", config)


class TestRowLimits:
    """Tests for row limit enforcement."""

    def test_unsafe_delete_no_where(self) -> None:
        """Test DELETE without recognizable WHERE pattern is blocked."""
        config = SafetyConfig(max_delete_rows=100)
        with pytest.raises(SafetyViolationError) as exc_info:
            # No WHERE clause → estimated as 10000 rows
            validate_sql("DELETE FROM posts WHERE 1=1", config)
        assert exc_info.value.code == ErrorCode.UNSAFE_DELETE

    def test_unsafe_update_no_where(self) -> None:
        """Test UPDATE without recognizable WHERE pattern is blocked."""
        config = SafetyConfig(max_update_rows=500)
        with pytest.raises(SafetyViolationError) as exc_info:
            # No WHERE clause → estimated as 10000 rows
            validate_sql("UPDATE posts SET status = 'archived' WHERE 1=1", config)
        assert exc_info.value.code == ErrorCode.UNSAFE_UPDATE

    def test_delete_with_limit_allowed(self) -> None:
        """Test DELETE with LIMIT is allowed."""
        config = SafetyConfig(max_delete_rows=100)
        # Should not raise
        validate_sql("DELETE FROM posts WHERE status = 'draft' LIMIT 50", config)

    def test_update_with_limit_allowed(self) -> None:
        """Test UPDATE with LIMIT is allowed."""
        config = SafetyConfig(max_update_rows=500)
        # Should not raise
        validate_sql("UPDATE posts SET status = 'archived' LIMIT 100", config)

    def test_update_with_single_equality_estimated_100(self) -> None:
        """Test UPDATE with 1 equality condition estimates ~100 rows."""
        # 1 equality = ~100 rows, which is within the 500 limit
        config = SafetyConfig(max_update_rows=500)
        validate_sql("UPDATE posts SET status = 'archived' WHERE status = 'draft'", config)

    def test_update_with_two_equalities_allowed(self) -> None:
        """Test UPDATE with 2 equality conditions estimates ~10 rows."""
        config = SafetyConfig(max_update_rows=500)
        # This is the pattern that was previously blocked (e.g. tenant_id + slug)
        validate_sql(
            "UPDATE posts SET updated_at = 123 WHERE tenant_id = 'abc' AND slug = 'test'",
            config,
        )

    def test_update_with_three_equalities_allowed(self) -> None:
        """Test UPDATE with 3+ equality conditions estimates ~1 row."""
        config = SafetyConfig(max_update_rows=500)
        validate_sql(
            "UPDATE posts SET status = 'draft' WHERE tenant_id = 'abc' AND slug = 'x' AND id = 'y'",
            config,
        )

    def test_single_equality_blocked_at_strict_limit(self) -> None:
        """Test single equality (100 rows) is blocked at strict limits."""
        config = SafetyConfig(max_update_rows=50)
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql("UPDATE posts SET status = 'archived' WHERE tenant_id = 'abc'", config)
        assert exc_info.value.code == ErrorCode.UNSAFE_UPDATE

    def test_force_bypasses_row_limits(self) -> None:
        """Test skip_row_limits bypasses row estimation checks."""
        config = SafetyConfig(max_update_rows=1)
        # Would normally be blocked, but force bypasses
        validate_sql(
            "UPDATE posts SET status = 'archived' WHERE tenant_id = 'abc'",
            config,
            skip_row_limits=True,
        )

    def test_force_still_requires_where(self) -> None:
        """Test skip_row_limits still enforces WHERE clause."""
        config = SafetyConfig(max_update_rows=1)
        with pytest.raises(SafetyViolationError) as exc_info:
            validate_sql(
                "UPDATE posts SET status = 'archived'",
                config,
                skip_row_limits=True,
            )
        assert exc_info.value.code == ErrorCode.MISSING_WHERE


class TestSelectQueries:
    """Tests for SELECT queries."""

    def test_select_always_allowed(self) -> None:
        """Test SELECT queries are always allowed."""
        config = SafetyConfig()
        # Should not raise
        validate_sql("SELECT * FROM users", config)
        validate_sql("SELECT id, name FROM posts WHERE author_id = 1", config)


class TestRowEstimation:
    """Tests for the _estimate_rows heuristic."""

    def test_limit_clause(self) -> None:
        """Test LIMIT clause is respected."""
        assert _estimate_rows("DELETE FROM posts WHERE x = 1 LIMIT 5") == 5

    def test_id_equals(self) -> None:
        """Test WHERE id = X returns 1."""
        assert _estimate_rows("UPDATE posts SET x = 1 WHERE id = 'abc'") == 1

    def test_id_in(self) -> None:
        """Test WHERE id IN (...) returns count."""
        assert _estimate_rows("DELETE FROM posts WHERE id IN ('a', 'b', 'c')") == 3

    def test_single_equality(self) -> None:
        """Test single equality condition estimates 100."""
        assert _estimate_rows("UPDATE posts SET x = 1 WHERE tenant_id = 'abc'") == 100

    def test_two_equalities(self) -> None:
        """Test two equality conditions estimate 10."""
        assert _estimate_rows("UPDATE posts SET x = 1 WHERE tenant_id = 'abc' AND slug = 'test'") == 10

    def test_three_equalities(self) -> None:
        """Test three equality conditions estimate 1."""
        assert _estimate_rows("UPDATE posts SET x = 1 WHERE tenant_id = 'a' AND slug = 'b' AND status = 'c'") == 1

    def test_no_where(self) -> None:
        """Test no WHERE clause returns 10000."""
        assert _estimate_rows("UPDATE posts SET x = 1") == 10000

    def test_where_without_equality(self) -> None:
        """Test WHERE without equality conditions returns 10000."""
        assert _estimate_rows("DELETE FROM posts WHERE created_at < 1000") == 10000


class TestAgentSafeConfig:
    """Tests for agent-safe configuration."""

    def test_agent_safe_stricter_limits(self) -> None:
        """Test agent config has stricter limits."""
        assert AGENT_SAFE_CONFIG.max_delete_rows == 50
        assert AGENT_SAFE_CONFIG.max_update_rows == 200

    def test_agent_safe_config_same_protected_tables(self) -> None:
        """Test agent config protects same tables."""
        default = SafetyConfig()
        assert AGENT_SAFE_CONFIG.protected_tables == default.protected_tables
