# Database Usage Guide - SQLite with Isolated Interface

## Overview

**MANDATORY** database architecture for all projects using databases in this suite. This guide establishes a standardized approach to database management using SQLite with complete SQL isolation.

**Core Principles:**
- **SQLite Only**: Use SQLite as the default database for all projects
- **Single Interface Module**: All database operations through `database.py`
- **Function-Based Abstraction**: Simple, reusable function interface
- **Complete SQL Isolation**: All SQL statements isolated in `database.py`
- **Programmatic Access**: Rest of codebase uses simple function calls

**When to Use This Guide:**
- **MANDATORY**: Every project that requires database functionality
- Before implementing any database features
- When designing data persistence layer
- Setting up new projects with data storage needs

---

## Quick Reference

### Standard Interface Pattern

```python
# database.py - All database code lives here
import sqlite3
from typing import List, Dict, Optional, Any

def init_db(db_path: str = "app.db") -> None:
    """Initialize database with schema."""
    # All SQL here

def db_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute SELECT query and return results."""
    # SQL execution here

def db_execute(query: str, params: tuple = ()) -> int:
    """Execute INSERT/UPDATE/DELETE and return affected rows."""
    # SQL execution here

def db_transaction(operations: List[tuple]) -> bool:
    """Execute multiple operations in a transaction."""
    # Transaction handling here
```

### Application Code Pattern

```python
# app.py - Application code uses simple function calls
from database import init_db, db_query, db_execute

# Initialize database
init_db()

# Query data (no SQL in application code!)
users = get_all_users()
user = get_user_by_id(user_id)

# Modify data (no SQL in application code!)
create_user(name="John", email="john@example.com")
update_user_email(user_id, "newemail@example.com")
```

---

## Why This Architecture?

### Benefits

1. **Maintainability**: All SQL in one place, easy to find and modify
2. **Testability**: Mock `database.py` functions for testing
3. **Flexibility**: Change database implementation without touching app code
4. **Security**: Centralized input validation and SQL injection prevention
5. **Simplicity**: Application code focuses on logic, not SQL
6. **Debugging**: Single point of failure for database issues

### Anti-Pattern (Don't Do This)

```python
# ❌ BAD: SQL scattered throughout codebase
def process_user(user_id):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    # SQL in application logic - AVOID THIS!
```

### Correct Pattern (Do This)

```python
# ✅ GOOD: Clean separation
def process_user(user_id):
    user = get_user_by_id(user_id)  # Database function
    # Pure application logic here
```

---

## Complete database.py Template

### Basic Template

```python
"""
database.py - Database interface module

All database operations and SQL statements are isolated in this module.
Application code should never write SQL directly.
"""

import sqlite3
import os
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime


# Database configuration
DB_PATH = "app.db"


def get_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    """
    Get database connection with proper configuration.

    Args:
        db_path: Path to SQLite database file

    Returns:
        Configured SQLite connection
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn


def init_db(db_path: str = DB_PATH, force: bool = False) -> None:
    """
    Initialize database with schema.

    Args:
        db_path: Path to SQLite database file
        force: If True, drop existing tables and recreate
    """
    conn = get_connection(db_path)
    cursor = conn.cursor()

    try:
        if force:
            # Drop existing tables
            cursor.execute("DROP TABLE IF EXISTS users")
            cursor.execute("DROP TABLE IF EXISTS sessions")

        # Create tables
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)
        """)

        conn.commit()

    except sqlite3.Error as e:
        conn.rollback()
        raise Exception(f"Database initialization failed: {e}")
    finally:
        conn.close()


def db_query(query: str, params: Tuple = ()) -> List[Dict[str, Any]]:
    """
    Execute SELECT query and return results as list of dictionaries.

    Args:
        query: SQL SELECT statement
        params: Query parameters (use ? placeholders)

    Returns:
        List of rows as dictionaries
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    except sqlite3.Error as e:
        raise Exception(f"Query failed: {e}")
    finally:
        conn.close()


def db_execute(query: str, params: Tuple = ()) -> int:
    """
    Execute INSERT/UPDATE/DELETE and return affected row count.

    Args:
        query: SQL statement
        params: Query parameters (use ? placeholders)

    Returns:
        Number of affected rows
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(query, params)
        conn.commit()
        return cursor.rowcount
    except sqlite3.Error as e:
        conn.rollback()
        raise Exception(f"Execute failed: {e}")
    finally:
        conn.close()


def db_execute_many(query: str, params_list: List[Tuple]) -> int:
    """
    Execute same query with multiple parameter sets.

    Args:
        query: SQL statement
        params_list: List of parameter tuples

    Returns:
        Total number of affected rows
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.executemany(query, params_list)
        conn.commit()
        return cursor.rowcount
    except sqlite3.Error as e:
        conn.rollback()
        raise Exception(f"Execute many failed: {e}")
    finally:
        conn.close()


def db_transaction(operations: List[Tuple[str, Tuple]]) -> bool:
    """
    Execute multiple operations in a transaction.

    Args:
        operations: List of (query, params) tuples

    Returns:
        True if all operations succeeded
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        for query, params in operations:
            cursor.execute(query, params)
        conn.commit()
        return True
    except sqlite3.Error as e:
        conn.rollback()
        raise Exception(f"Transaction failed: {e}")
    finally:
        conn.close()


def db_insert(query: str, params: Tuple = ()) -> int:
    """
    Execute INSERT and return the last inserted row ID.

    Args:
        query: SQL INSERT statement
        params: Query parameters

    Returns:
        Last inserted row ID
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(query, params)
        conn.commit()
        return cursor.lastrowid
    except sqlite3.Error as e:
        conn.rollback()
        raise Exception(f"Insert failed: {e}")
    finally:
        conn.close()


# =============================================================================
# Domain-Specific Functions (Application Interface)
# =============================================================================
# These functions provide clean, SQL-free interface for application code

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user by ID."""
    results = db_query(
        "SELECT * FROM users WHERE id = ?",
        (user_id,)
    )
    return results[0] if results else None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email."""
    results = db_query(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    )
    return results[0] if results else None


def get_all_users() -> List[Dict[str, Any]]:
    """Get all users."""
    return db_query("SELECT * FROM users ORDER BY created_at DESC")


def create_user(username: str, email: str) -> int:
    """
    Create new user.

    Args:
        username: User's username
        email: User's email

    Returns:
        New user ID
    """
    return db_insert(
        "INSERT INTO users (username, email) VALUES (?, ?)",
        (username, email)
    )


def update_user_email(user_id: int, new_email: str) -> bool:
    """Update user's email."""
    affected = db_execute(
        "UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_email, user_id)
    )
    return affected > 0


def delete_user(user_id: int) -> bool:
    """Delete user by ID."""
    affected = db_execute(
        "DELETE FROM users WHERE id = ?",
        (user_id,)
    )
    return affected > 0


def create_session(user_id: int, token: str, expires_at: datetime) -> int:
    """Create new session."""
    return db_insert(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
        (user_id, token, expires_at.isoformat())
    )


def get_session_by_token(token: str) -> Optional[Dict[str, Any]]:
    """Get session by token."""
    results = db_query(
        "SELECT * FROM sessions WHERE token = ? AND expires_at > CURRENT_TIMESTAMP",
        (token,)
    )
    return results[0] if results else None


def delete_expired_sessions() -> int:
    """Delete all expired sessions."""
    return db_execute(
        "DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP"
    )


# =============================================================================
# Utility Functions
# =============================================================================

def db_exists(db_path: str = DB_PATH) -> bool:
    """Check if database file exists."""
    return os.path.exists(db_path)


def db_vacuum(db_path: str = DB_PATH) -> None:
    """Optimize database by reclaiming unused space."""
    conn = get_connection(db_path)
    conn.execute("VACUUM")
    conn.close()


def get_table_names(db_path: str = DB_PATH) -> List[str]:
    """Get list of all table names."""
    results = db_query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )
    return [row['name'] for row in results]


def get_table_schema(table_name: str) -> str:
    """Get CREATE statement for table."""
    results = db_query(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
        (table_name,)
    )
    return results[0]['sql'] if results else ""


def count_rows(table_name: str) -> int:
    """Count rows in table."""
    results = db_query(f"SELECT COUNT(*) as count FROM {table_name}")
    return results[0]['count']
```

---

## Application Integration

### Example Application Structure

```
project/
├── app.py              # Main application
├── database.py         # Database interface (ALL SQL HERE)
├── models.py           # Data models (optional)
├── utils.py            # Utilities
└── tests/
    └── test_database.py
```

### Example Application Code

```python
# app.py
from database import (
    init_db,
    get_all_users,
    get_user_by_id,
    create_user,
    update_user_email,
    delete_user
)

def main():
    # Initialize database
    init_db()

    # Create user (no SQL in sight!)
    user_id = create_user("alice", "alice@example.com")
    print(f"Created user with ID: {user_id}")

    # Get user
    user = get_user_by_id(user_id)
    print(f"User: {user['username']} ({user['email']})")

    # Update user
    update_user_email(user_id, "alice.new@example.com")

    # List all users
    all_users = get_all_users()
    for user in all_users:
        print(f"  - {user['username']}: {user['email']}")

    # Delete user
    delete_user(user_id)

if __name__ == "__main__":
    main()
```

---

## Best Practices

### 1. Never Write SQL Outside database.py

```python
# ❌ WRONG: SQL in application code
def get_active_users():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE active = 1")
    return cursor.fetchall()

# ✅ CORRECT: Add function to database.py
# In database.py:
def get_active_users() -> List[Dict[str, Any]]:
    """Get all active users."""
    return db_query("SELECT * FROM users WHERE active = 1")

# In app.py:
from database import get_active_users
users = get_active_users()
```

### 2. Always Use Parameterized Queries

```python
# ❌ WRONG: SQL injection vulnerability
def get_user(email):
    return db_query(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ CORRECT: Parameterized query
def get_user(email: str) -> Optional[Dict[str, Any]]:
    results = db_query(
        "SELECT * FROM users WHERE email = ?",
        (email,)
    )
    return results[0] if results else None
```

### 3. Use Transactions for Multiple Operations

```python
# ✅ CORRECT: Multiple operations in transaction
def transfer_ownership(from_user_id: int, to_user_id: int, item_id: int) -> bool:
    """Transfer item ownership in a transaction."""
    operations = [
        ("UPDATE items SET owner_id = ? WHERE id = ?", (to_user_id, item_id)),
        ("INSERT INTO audit_log (action, user_id, item_id) VALUES (?, ?, ?)",
         ('transfer', from_user_id, item_id))
    ]
    return db_transaction(operations)
```

### 4. Return Meaningful Types

```python
# ✅ CORRECT: Clear return types
def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Returns user dict or None if not found."""

def get_all_users() -> List[Dict[str, Any]]:
    """Returns list of user dicts (empty list if none)."""

def create_user(username: str, email: str) -> int:
    """Returns new user ID."""

def delete_user(user_id: int) -> bool:
    """Returns True if user was deleted."""
```

### 5. Handle Errors Gracefully

```python
def safe_create_user(username: str, email: str) -> Optional[int]:
    """
    Create user with error handling.

    Returns:
        User ID on success, None on failure
    """
    try:
        return create_user(username, email)
    except Exception as e:
        print(f"Failed to create user: {e}")
        return None
```

---

## Testing

### Test Database Functions

```python
# tests/test_database.py
import os
import pytest
from database import (
    init_db,
    get_user_by_id,
    create_user,
    get_all_users,
    delete_user
)

TEST_DB = "test.db"

@pytest.fixture
def test_db():
    """Create test database."""
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    init_db(TEST_DB)
    yield TEST_DB
    os.remove(TEST_DB)

def test_create_and_get_user(test_db):
    """Test user creation and retrieval."""
    user_id = create_user("testuser", "test@example.com")
    assert user_id > 0

    user = get_user_by_id(user_id)
    assert user is not None
    assert user['username'] == "testuser"
    assert user['email'] == "test@example.com"

def test_get_all_users(test_db):
    """Test getting all users."""
    create_user("user1", "user1@example.com")
    create_user("user2", "user2@example.com")

    users = get_all_users()
    assert len(users) == 2

def test_delete_user(test_db):
    """Test user deletion."""
    user_id = create_user("deleteuser", "delete@example.com")
    assert delete_user(user_id) is True
    assert get_user_by_id(user_id) is None
```

---

## Migration Patterns

### Adding New Tables

```python
# Add to init_db() in database.py
def init_db(db_path: str = DB_PATH, force: bool = False) -> None:
    # ... existing code ...

    # Add new table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
```

### Adding New Columns

```python
# Add migration function
def migrate_add_user_status():
    """Add status column to users table."""
    try:
        db_execute("""
            ALTER TABLE users
            ADD COLUMN status TEXT DEFAULT 'active'
        """)
        return True
    except Exception as e:
        print(f"Migration failed: {e}")
        return False
```

---

## Common Patterns

### Pagination

```python
def get_users_paginated(page: int = 1, per_page: int = 10) -> List[Dict[str, Any]]:
    """Get users with pagination."""
    offset = (page - 1) * per_page
    return db_query(
        "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (per_page, offset)
    )
```

### Search

```python
def search_users(query: str) -> List[Dict[str, Any]]:
    """Search users by username or email."""
    search_term = f"%{query}%"
    return db_query(
        """
        SELECT * FROM users
        WHERE username LIKE ? OR email LIKE ?
        ORDER BY username
        """,
        (search_term, search_term)
    )
```

### Soft Delete

```python
def soft_delete_user(user_id: int) -> bool:
    """Mark user as deleted without removing from database."""
    affected = db_execute(
        "UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?",
        (user_id,)
    )
    return affected > 0
```

---

## Anti-Patterns to Avoid

### ❌ Don't: Scatter SQL Throughout Codebase

```python
# ❌ WRONG: SQL in multiple files
# In user_handler.py
conn = sqlite3.connect('app.db')
cursor.execute("SELECT * FROM users")

# In auth.py
conn = sqlite3.connect('app.db')
cursor.execute("UPDATE users SET last_login = ?")
```

### ❌ Don't: Mix Database Logic with Business Logic

```python
# ❌ WRONG: Database operations mixed with business logic
def process_order(order_id):
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    order = cursor.fetchone()

    # Business logic
    total = calculate_total(order)

    # More database operations
    cursor.execute("UPDATE orders SET total = ? WHERE id = ?", (total, order_id))
    conn.commit()
```

### ❌ Don't: Use String Formatting for SQL

```python
# ❌ WRONG: SQL injection vulnerability!
def get_user(email):
    query = f"SELECT * FROM users WHERE email = '{email}'"
    return db_query(query)
```

---

## Performance Tips

### 1. Use Indexes

```python
# In init_db()
cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
""")
```

### 2. Batch Operations

```python
# ✅ GOOD: Batch insert
def create_users_batch(users: List[Tuple[str, str]]) -> int:
    """Create multiple users in one operation."""
    return db_execute_many(
        "INSERT INTO users (username, email) VALUES (?, ?)",
        users
    )
```

### 3. Connection Pooling (For Production)

```python
# For high-traffic applications, consider connection pooling
from contextlib import contextmanager

@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
```

---

## Related Guides

- **[secrets_management.md](secrets_management.md)** - If database contains sensitive data
- **[testing_strategies.md](testing_strategies.md)** - Testing database functions
- **[git_guide.md](git_guide.md)** - Don't commit database files

---

## Summary: The Golden Rules

1. ✅ **Always use SQLite** as the default database
2. ✅ **All SQL in database.py** - nowhere else
3. ✅ **Function-based interface** - simple, reusable functions
4. ✅ **Parameterized queries** - prevent SQL injection
5. ✅ **Meaningful return types** - Optional, List, bool, int
6. ✅ **Transaction support** - for multi-operation consistency
7. ✅ **Clean separation** - database logic separate from business logic
8. ✅ **Test your database functions** - ensure reliability
9. ✅ **Add database.py to .gitignore** - don't commit database files
10. ✅ **Document your functions** - clear docstrings for all database functions

**This architecture ensures maintainable, testable, and secure database operations across all projects in the suite.**

---

*Last updated: 2025-11-02*
*Database Standard: SQLite with database.py interface*
