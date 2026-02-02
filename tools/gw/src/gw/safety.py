"""Database safety layer for SQL operations."""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class ErrorCode(Enum):
    """Safety violation error codes."""

    DDL_BLOCKED = "DDL_BLOCKED"
    DANGEROUS_PATTERN = "DANGEROUS_PATTERN"
    MISSING_WHERE = "MISSING_WHERE"
    PROTECTED_TABLE = "PROTECTED_TABLE"
    UNSAFE_DELETE = "UNSAFE_DELETE"
    UNSAFE_UPDATE = "UNSAFE_UPDATE"


class SafetyViolationError(Exception):
    """Raised when a SQL operation violates safety rules."""

    def __init__(self, code: ErrorCode, message: str, sql: str = ""):
        """Initialize safety violation error."""
        self.code = code
        self.message = message
        self.sql = sql
        super().__init__(f"[{code.value}] {message}")


@dataclass
class SafetyConfig:
    """Configuration for database safety validation."""

    max_delete_rows: int = 100
    max_update_rows: int = 500
    protected_tables: list[str] = None

    def __post_init__(self) -> None:
        """Initialize protected tables if not provided."""
        if self.protected_tables is None:
            self.protected_tables = [
                "users",
                "tenants",
                "subscriptions",
                "payments",
                "sessions",
            ]


# Default agent safe config with stricter limits
AGENT_SAFE_CONFIG = SafetyConfig(
    max_delete_rows=50,
    max_update_rows=200,
    protected_tables=[
        "users",
        "tenants",
        "subscriptions",
        "payments",
        "sessions",
    ],
)


def extract_table_name(sql: str) -> Optional[str]:
    """Extract table name from SQL query."""
    # Match FROM or UPDATE or INTO clauses
    patterns = [
        r"(?:FROM|UPDATE|INTO)\s+`?(\w+)`?",
        r"(?:FROM|UPDATE|INTO)\s+(?:\")?(\w+)(?:\")?",
    ]

    sql_upper = sql.upper()
    for pattern in patterns:
        match = re.search(pattern, sql_upper)
        if match:
            return match.group(1).lower()
    return None


def get_operation_type(sql: str) -> str:
    """Determine SQL operation type."""
    sql_upper = sql.strip().upper()

    if sql_upper.startswith("SELECT"):
        return "SELECT"
    elif sql_upper.startswith("INSERT"):
        return "INSERT"
    elif sql_upper.startswith("UPDATE"):
        return "UPDATE"
    elif sql_upper.startswith("DELETE"):
        return "DELETE"
    elif sql_upper.startswith("CREATE"):
        return "CREATE"
    elif sql_upper.startswith("DROP"):
        return "DROP"
    elif sql_upper.startswith("ALTER"):
        return "ALTER"
    elif sql_upper.startswith("TRUNCATE"):
        return "TRUNCATE"
    else:
        return "UNKNOWN"


def validate_sql(sql: str, config: SafetyConfig) -> None:
    """Validate SQL query against safety rules.

    Args:
        sql: SQL query to validate
        config: Safety configuration

    Raises:
        SafetyViolationError: If query violates safety rules
    """
    sql_upper = sql.strip().upper()
    operation = get_operation_type(sql)

    # Block DDL operations
    ddl_operations = ["CREATE", "DROP", "ALTER", "TRUNCATE"]
    if operation in ddl_operations:
        raise SafetyViolationError(
            ErrorCode.DDL_BLOCKED,
            f"{operation} operations are blocked for safety",
            sql,
        )

    # Check for dangerous patterns (stacked queries, comments)
    if _has_dangerous_patterns(sql):
        raise SafetyViolationError(
            ErrorCode.DANGEROUS_PATTERN,
            "Query contains dangerous patterns (multiple statements, comments, etc.)",
            sql,
        )

    # For DELETE, check WHERE clause first (DELETE requires WHERE)
    if operation == "DELETE" and not _has_where_clause(sql):
        raise SafetyViolationError(
            ErrorCode.MISSING_WHERE,
            "DELETE without WHERE clause is blocked",
            sql,
        )

    # Check table protection for mutation operations only (before row limit/WHERE checks for UPDATE)
    if operation in ["DELETE", "UPDATE", "INSERT"]:
        table_name = extract_table_name(sql)
        if table_name and table_name.lower() in config.protected_tables:
            # For protected tables, always check WHERE before anything else
            if operation in ["DELETE", "UPDATE"] and not _has_where_clause(sql):
                if operation == "UPDATE" and "LIMIT" in sql.upper():
                    # UPDATE on protected table with LIMIT still needs WHERE check
                    raise SafetyViolationError(
                        ErrorCode.MISSING_WHERE,
                        f"{operation} on protected table '{table_name}' without WHERE is blocked",
                        sql,
                    )
                elif operation == "DELETE":
                    # DELETE on protected table without WHERE
                    raise SafetyViolationError(
                        ErrorCode.MISSING_WHERE,
                        f"{operation} on protected table '{table_name}' without WHERE is blocked",
                        sql,
                    )
                elif operation == "UPDATE":
                    raise SafetyViolationError(
                        ErrorCode.MISSING_WHERE,
                        f"{operation} on protected table '{table_name}' without WHERE is blocked",
                        sql,
                    )

            raise SafetyViolationError(
                ErrorCode.PROTECTED_TABLE,
                f"Table '{table_name}' is protected",
                sql,
            )

    # Check row limits for DELETE operations
    if operation == "DELETE":
        estimated_rows = _estimate_rows(sql)
        if estimated_rows > config.max_delete_rows:
            raise SafetyViolationError(
                ErrorCode.UNSAFE_DELETE,
                f"Estimated {estimated_rows} rows to delete exceeds limit of {config.max_delete_rows}",
                sql,
            )

    # For UPDATE on unprotected tables, check row limits before WHERE
    if operation == "UPDATE":
        estimated_rows = _estimate_rows(sql)
        if estimated_rows > config.max_update_rows:
            raise SafetyViolationError(
                ErrorCode.UNSAFE_UPDATE,
                f"Estimated {estimated_rows} rows to update exceeds limit of {config.max_update_rows}",
                sql,
            )

    # Check for missing WHERE clause on UPDATE (unless LIMIT is provided)
    if operation == "UPDATE" and not _has_where_clause(sql):
        if "LIMIT" not in sql.upper():
            raise SafetyViolationError(
                ErrorCode.MISSING_WHERE,
                "UPDATE without WHERE clause is blocked",
                sql,
            )


def _has_dangerous_patterns(sql: str) -> bool:
    """Check for dangerous SQL patterns."""
    # Check for multiple statements (semicolon followed by non-whitespace)
    if re.search(r";\s*[a-zA-Z]", sql):
        return True

    # Check for SQL comments that might hide malicious code
    if "--" in sql or "/*" in sql:
        return True

    return False


def _has_where_clause(sql: str) -> bool:
    """Check if query has WHERE clause."""
    sql_upper = sql.upper()
    # Look for WHERE keyword
    return "WHERE" in sql_upper


def _estimate_rows(sql: str) -> int:
    """Estimate number of rows affected by query.

    For queries with LIMIT, returns the limit.
    For queries with WHERE and a specific ID condition, returns 1.
    For all other queries without LIMIT, returns 10000 (conservative).
    """
    sql_upper = sql.upper()

    # Check for LIMIT clause
    if "LIMIT" in sql_upper:
        match = re.search(r"LIMIT\s+(\d+)", sql_upper)
        if match:
            return int(match.group(1))

    # Check for ID-based WHERE clause (WHERE id = X, WHERE id IN (X), etc.)
    if "WHERE" in sql_upper:
        # If it's a specific ID lookup, assume 1 row
        if re.search(r"WHERE\s+\w*\.?\bID\b\s*=\s*", sql_upper):
            return 1
        # For IN clauses, count the items
        match = re.search(r"WHERE\s+\w*\.?\bID\b\s+IN\s*\(([^)]+)\)", sql_upper)
        if match:
            items = match.group(1).split(",")
            return len(items)

    # Conservative estimate: assume large number if no LIMIT or safe pattern
    return 10000
