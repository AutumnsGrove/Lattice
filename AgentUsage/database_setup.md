# Database Setup Guide

## Overview

This guide focuses on SQLite as the default database choice for most projects. SQLite is a self-contained, serverless database that works perfectly for development, testing, and many production applications.

**Database Options:**
- **SQLite** (Recommended): File-based, zero-configuration, perfect for most projects
- **PostgreSQL**: For projects requiring advanced features, high concurrency, or multi-user access
- **MySQL/MariaDB**: Alternative to PostgreSQL with similar capabilities

**Default Choice: SQLite**
Unless you have specific requirements for PostgreSQL features, start with SQLite. You can always migrate later if needed.

## Quick Reference

```bash
# SQLite Command Line
sqlite3 database.db         # Open/create database
.tables                     # List all tables
.schema table_name          # Show table structure
.dump                       # Export entire database
.quit                       # Exit
```

```python
# Python Quick Start
import sqlite3
conn = sqlite3.connect('database.db')
cursor = conn.cursor()
cursor.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
cursor.execute("INSERT INTO users (name) VALUES (?)", ("Alice",))
conn.commit()
conn.close()
```

## When to Use SQLite

### Perfect For:
- **Single-user applications** (desktop apps, CLI tools, personal projects)
- **Development and testing** (fast, no setup required)
- **Small to medium web applications** (< 100k requests/day)
- **Embedded applications** (mobile apps, IoT devices)
- **Data analysis and prototyping** (Jupyter notebooks, data science)
- **File-based storage needs** (configuration, caches, local data)

### Advantages:
- Zero configuration required
- No separate server process
- Single file database (easy backup, versioning, deployment)
- Built into Python (no installation needed)
- Fast for read-heavy workloads
- Full ACID compliance
- Excellent for development/testing
- Works great with version control (small databases)

### Consider PostgreSQL Instead When:
- Multiple concurrent writers (> 10 simultaneous write operations)
- Database size > 100 GB
- Need advanced features (full-text search, JSON operations, array types)
- Require user-level permissions and roles
- Need network access from multiple servers
- Replication and high availability required

## Python SQLite Libraries

### Built-in sqlite3 Library

```python
import sqlite3

# Basic usage with row factory for named column access
def get_user(user_id):
    with sqlite3.connect('app.db') as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        return cursor.fetchone()

def create_user(name, email):
    with sqlite3.connect('app.db') as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", (name, email))
        conn.commit()
        return cursor.lastrowid
```

**Note**: For complex applications with relationships and migrations, consider SQLAlchemy ORM.

## Connection Management

### Context Manager Pattern (Recommended)

```python
from contextlib import contextmanager
import sqlite3

@contextmanager
def get_db_connection(db_path='app.db'):
    """Context manager for database connections with automatic commit/rollback."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# Usage
with get_db_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
```


## Schema Migration

```python
# Simple schema versioning
import sqlite3

def run_migration(db_path='app.db'):
    """Initialize or update database schema."""
    with sqlite3.connect(db_path) as conn:
        # Create schema version table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY
            )
        """)

        # Check current version
        cursor = conn.cursor()
        cursor.execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        current = cursor.fetchone()
        version = current[0] if current else 0

        # Apply migrations
        if version < 1:
            conn.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("INSERT INTO schema_version (version) VALUES (1)")
            print("Migration to version 1 complete")
```

## Query Patterns and Best Practices

### Parameterized Queries (Prevent SQL Injection)

```python
# GOOD: Always use parameterized queries
def get_user_by_email(email):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        return cursor.fetchone()

# BAD: Never use string formatting - VULNERABLE to SQL injection!
# query = f"SELECT * FROM users WHERE email = '{email}'"
```

### CRUD Operations

```python
class UserRepository:
    def __init__(self, db_path='app.db'):
        self.db_path = db_path

    def create(self, name, email):
        """Create a new user."""
        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", (name, email))
            return cursor.lastrowid

    def get(self, user_id):
        """Get user by ID."""
        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            return cursor.fetchone()

    def update(self, user_id, **kwargs):
        """Update user information."""
        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()
            for field, value in kwargs.items():
                cursor.execute(f"UPDATE users SET {field} = ? WHERE id = ?", (value, user_id))
            return cursor.rowcount

    def delete(self, user_id):
        """Delete a user."""
        with get_db_connection(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            return cursor.rowcount
```

### Transactions

```python
def transfer_credits(from_user_id, to_user_id, amount):
    """Atomic transaction - both operations succeed or both fail."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET credits = credits - ? WHERE id = ?", (amount, from_user_id))
        cursor.execute("UPDATE users SET credits = credits + ? WHERE id = ?", (amount, to_user_id))
```

## Testing with Databases

```python
# test_users.py
import pytest
import sqlite3

@pytest.fixture
def db():
    """Create an in-memory database for testing."""
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE
        )
    """)
    yield conn
    conn.close()

def test_create_user(db):
    """Test user creation."""
    cursor = db.cursor()
    cursor.execute("INSERT INTO users (name, email) VALUES (?, ?)", ("Alice", "alice@example.com"))
    db.commit()

    cursor.execute("SELECT * FROM users WHERE name = ?", ("Alice",))
    user = cursor.fetchone()
    assert user['name'] == "Alice"
    assert user['email'] == "alice@example.com"
```

## Backup Strategies

```python
import sqlite3
from datetime import datetime

def backup_database(db_path='app.db', backup_path=None):
    """Create backup using SQLite's backup API (safe during use)."""
    if not backup_path:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = f"backups/app_{timestamp}.db"

    source = sqlite3.connect(db_path)
    backup = sqlite3.connect(backup_path)
    source.backup(backup)
    backup.close()
    source.close()
    return backup_path
```

**Command line backups:**
```bash
sqlite3 app.db ".backup backup.db"              # Binary backup
sqlite3 app.db .dump > backup.sql               # SQL dump
sqlite3 new_app.db < backup.sql                 # Restore
```

## When to Consider PostgreSQL

**Key Differences:**
- **Concurrency**: PostgreSQL handles 100+ concurrent writers; SQLite struggles with 10+
- **Size**: PostgreSQL scales to terabytes; SQLite optimal under 100 GB
- **Features**: PostgreSQL offers full-text search, JSON operations, advanced indexing
- **Networking**: PostgreSQL supports remote connections; SQLite is file-based only
- **Permissions**: PostgreSQL has user-level access control; SQLite uses file permissions
- **Replication**: PostgreSQL supports replication/clustering; SQLite requires custom solutions
- **Data Types**: PostgreSQL has arrays, JSONB, geometric types; SQLite has basic types only


## Performance Optimization

```python
def optimize_database(db_path='app.db'):
    """Run common optimizations."""
    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA journal_mode=WAL")      # Better concurrency
        conn.execute("PRAGMA cache_size=-2000")      # 2MB cache
        conn.execute("ANALYZE")                      # Query optimization
        conn.execute("VACUUM")                       # Reclaim space
```

---

**Remember**: Start with SQLite. It's simple, fast, and perfect for most projects. Migrate to PostgreSQL only when you have specific requirements that SQLite can't meet.
