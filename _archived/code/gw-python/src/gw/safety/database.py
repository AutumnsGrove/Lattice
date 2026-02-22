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


def validate_sql(sql: str, config: SafetyConfig, *, skip_row_limits: bool = False) -> None:
    """Validate SQL query against safety rules.

    Args:
        sql: SQL query to validate
        config: Safety configuration
        skip_row_limits: Skip row-count estimation checks (--force).
            Still enforces WHERE clause, protected table, and DDL checks.

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
    if operation == "DELETE" and not skip_row_limits:
        estimated_rows = _estimate_rows(sql)
        if estimated_rows > config.max_delete_rows:
            raise SafetyViolationError(
                ErrorCode.UNSAFE_DELETE,
                f"Estimated {estimated_rows} rows to delete exceeds limit of {config.max_delete_rows}. "
                f"Use --force to bypass row-limit checks.",
                sql,
            )

    # For UPDATE on unprotected tables, check row limits before WHERE
    if operation == "UPDATE" and not skip_row_limits:
        estimated_rows = _estimate_rows(sql)
        if estimated_rows > config.max_update_rows:
            raise SafetyViolationError(
                ErrorCode.UNSAFE_UPDATE,
                f"Estimated {estimated_rows} rows to update exceeds limit of {config.max_update_rows}. "
                f"Use --force to bypass row-limit checks.",
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

    Recognition order:
      1. LIMIT clause → return that number
      2. WHERE id = X → 1 row
      3. WHERE id IN (X, Y, ...) → count of items
      4. WHERE with equality conditions → estimate from condition count
         (each equality condition narrows significantly)
      5. No recognizable pattern → 10000 (conservative fallback)
    """
    sql_upper = sql.upper()

    # Check for LIMIT clause
    if "LIMIT" in sql_upper:
        match = re.search(r"LIMIT\s+(\d+)", sql_upper)
        if match:
            return int(match.group(1))

    if "WHERE" not in sql_upper:
        return 10000

    # Extract the WHERE clause (everything after WHERE, before ORDER BY/LIMIT/GROUP BY)
    where_match = re.search(
        r"WHERE\s+(.*?)(?:\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|\s*$)",
        sql_upper,
        re.DOTALL,
    )
    if not where_match:
        return 10000

    where_clause = where_match.group(1)

    # Check for ID-based WHERE clause (WHERE id = X)
    if re.search(r"\bID\b\s*=\s*", where_clause):
        return 1

    # For IN clauses on id, count the items
    in_match = re.search(r"\bID\b\s+IN\s*\(([^)]+)\)", where_clause)
    if in_match:
        items = in_match.group(1).split(",")
        return len(items)

    # Count equality conditions (column = value patterns)
    # Each AND-ed equality condition narrows the result set significantly
    # Require the LHS to start with a letter (column name, not a numeric literal like 1=1)
    equality_conditions = re.findall(r"\b[A-Z_][A-Z0-9_]*\b\s*=\s*", where_clause)
    if equality_conditions:
        count = len(equality_conditions)
        # 1 equality → ~100 rows (e.g. tenant_id = X)
        # 2 equalities → ~10 rows (e.g. tenant_id = X AND slug = Y)
        # 3+ equalities → ~1 row (very specific)
        if count >= 3:
            return 1
        elif count == 2:
            return 10
        else:
            return 100

    # Conservative estimate: assume large number if no recognizable pattern
    return 10000
