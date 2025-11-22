# Code Style Guide

## Overview

This guide covers general code style principles and best practices that apply across languages. For Python-specific tooling (Black, Ruff, mypy), see [code_quality.md](code_quality.md). For language-specific patterns, see [multi_language_guide.md](multi_language_guide.md).

## Core Principles

### 1. Clarity Over Cleverness
Write code that's easy to understand, not code that impresses with complexity.

```python
# ❌ Clever but unclear
result = [x for x in range(10) if x % 2 == 0 if x > 5]

# ✅ Clear and readable
numbers = range(10)
even_numbers = [x for x in numbers if x % 2 == 0]
result = [x for x in even_numbers if x > 5]
```

### 2. Consistency Matters
Follow the established patterns in your codebase. When in Rome, do as the Romans do.

### 3. Meaningful Names
Use descriptive names that reveal intent.

```python
# ❌ Unclear
def proc(d, x):
    return d[x] if x in d else None

# ✅ Clear
def get_user_by_id(users_dict, user_id):
    return users_dict.get(user_id, None)
```

## Naming Conventions

### Functions and Methods

**Use verb phrases** that describe what the function does:

```python
# Good function names
def calculate_total_price()
def send_email_notification()
def validate_user_input()
def fetch_data_from_api()
```

**Boolean functions** should ask a question:

```python
def is_valid()
def has_permission()
def can_edit()
def should_retry()
```

### Variables

**Use nouns** that describe what the variable contains:

```python
# Good variable names
user_count = 42
total_price = 99.99
error_message = "Invalid input"
api_response = fetch_data()
```

**Avoid abbreviations** unless they're universally understood:

```python
# ❌ Unclear abbreviations
usr_cnt = 42
tot_pr = 99.99
msg = "Error"

# ✅ Clear names
user_count = 42
total_price = 99.99
message = "Error"

# ✅ OK - universally understood
html_content = "<div>..."
api_key = "sk-..."
url = "https://..."
```

### Constants

**Use UPPERCASE_WITH_UNDERSCORES**:

```python
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT = 30
API_BASE_URL = "https://api.example.com"
```

### Classes

**Use PascalCase** and noun phrases:

```python
class UserAccount:
    pass

class EmailValidator:
    pass

class DatabaseConnection:
    pass
```

## Function Design

### Single Responsibility Principle

Each function should do one thing well.

```python
# ❌ Function doing too much
def process_user_data(user_data):
    # Validates input
    if not user_data.get('email'):
        raise ValueError("Email required")

    # Connects to database
    conn = psycopg2.connect(...)

    # Saves to database
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users...")

    # Sends email
    send_email(user_data['email'])

    # Returns result
    return {"status": "success"}

# ✅ Separated concerns
def validate_user_data(user_data):
    if not user_data.get('email'):
        raise ValueError("Email required")

def save_user_to_database(user_data, connection):
    cursor = connection.cursor()
    cursor.execute("INSERT INTO users...", user_data)

def notify_user_created(email):
    send_email(email, subject="Welcome!")

def process_user_data(user_data):
    validate_user_data(user_data)
    conn = get_database_connection()
    save_user_to_database(user_data, conn)
    notify_user_created(user_data['email'])
    return {"status": "success"}
```

### Function Length

**Guideline**: Keep functions under 50 lines. If longer, consider splitting.

```python
# ❌ Too long (150 lines)
def process_order():
    # 150 lines of logic...
    pass

# ✅ Split into smaller functions
def validate_order(order):
    # 20 lines
    pass

def calculate_pricing(order):
    # 15 lines
    pass

def charge_payment(order):
    # 25 lines
    pass

def process_order(order):
    validate_order(order)
    pricing = calculate_pricing(order)
    charge_payment(order)
```

### Function Arguments

**Limit to 3-4 arguments**. If you need more, use a dictionary/object.

```python
# ❌ Too many arguments
def create_user(name, email, password, age, city, country, phone, address):
    pass

# ✅ Use a dict/dataclass
def create_user(user_data):
    name = user_data['name']
    email = user_data['email']
    # ...
```

## Error Handling

### Be Explicit About Errors

```python
# ❌ Silent failure
def divide(a, b):
    try:
        return a / b
    except:
        return None

# ✅ Explicit error handling
def divide(a, b):
    if b == 0:
        raise ValueError(f"Cannot divide {a} by zero")
    return a / b
```

### Provide Helpful Error Messages

```python
# ❌ Unhelpful
raise ValueError("Invalid input")

# ✅ Helpful
raise ValueError(
    f"Expected 'email' field to be a valid email address, "
    f"but got: {user_input}"
)
```

### Don't Catch Everything

```python
# ❌ Too broad
try:
    process_data()
except Exception:
    print("Something went wrong")

# ✅ Specific exceptions
try:
    process_data()
except FileNotFoundError as e:
    logger.error(f"Config file missing: {e}")
except json.JSONDecodeError as e:
    logger.error(f"Invalid JSON in config: {e}")
```

## Comments and Documentation

### When to Comment

**Do comment:**
- Complex algorithms or business logic
- Non-obvious workarounds or hacks
- "Why" something is done a certain way
- Public API functions (docstrings)

**Don't comment:**
- What the code obviously does
- Outdated information
- Commented-out code (delete it instead)

```python
# ❌ Obvious comment
# Increment counter by 1
counter += 1

# ✅ Explains "why"
# Retry 3 times because API occasionally returns 503 under load
max_retries = 3

# ✅ Documents complex logic
def calculate_discount(price, user_tier):
    """
    Calculate discount based on user tier and purchase history.

    Platinum users: 20% discount
    Gold users: 15% discount if price > $100, else 10%
    Silver users: 5% discount

    Args:
        price: Total purchase amount
        user_tier: User's membership tier (platinum|gold|silver)

    Returns:
        Discounted price as float
    """
    # Implementation...
```

### Docstring Format

```python
def function_name(param1, param2):
    """
    Brief description of what the function does.

    Longer explanation if needed. Explain edge cases,
    assumptions, or important behavior.

    Args:
        param1: Description of first parameter
        param2: Description of second parameter

    Returns:
        Description of return value

    Raises:
        ValueError: When param1 is negative
        TypeError: When param2 is not a string
    """
    pass
```

## Code Organization

### Import Order

1. Standard library imports
2. Third-party library imports
3. Local application imports

```python
# Standard library
import os
import sys
from pathlib import Path

# Third-party
import requests
from fastapi import FastAPI
import pandas as pd

# Local
from myapp.models import User
from myapp.utils import validate_input
```

### File Organization

```python
# 1. Module docstring
"""
Module for handling user authentication.
"""

# 2. Imports (in order above)
import os
from typing import Optional

# 3. Constants
MAX_LOGIN_ATTEMPTS = 3
DEFAULT_SESSION_TIMEOUT = 3600

# 4. Classes
class UserSession:
    pass

# 5. Functions
def authenticate_user():
    pass

# 6. Main execution
if __name__ == "__main__":
    main()
```

## Common Patterns

### Configuration Separation

```python
# ❌ Hardcoded config
def connect_to_database():
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="mydb"
    )

# ✅ Externalized config
def connect_to_database(config):
    conn = psycopg2.connect(
        host=config.DB_HOST,
        port=config.DB_PORT,
        database=config.DB_NAME
    )
```

### Early Returns

```python
# ❌ Nested conditions
def process_payment(amount, user):
    if amount > 0:
        if user.has_payment_method():
            if user.balance >= amount:
                return charge_user(user, amount)
            else:
                return "Insufficient balance"
        else:
            return "No payment method"
    else:
        return "Invalid amount"

# ✅ Early returns
def process_payment(amount, user):
    if amount <= 0:
        return "Invalid amount"

    if not user.has_payment_method():
        return "No payment method"

    if user.balance < amount:
        return "Insufficient balance"

    return charge_user(user, amount)
```

### DRY (Don't Repeat Yourself)

```python
# ❌ Repetitive
def save_user():
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users...")
    conn.commit()
    conn.close()

def save_order():
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO orders...")
    conn.commit()
    conn.close()

# ✅ Extracted common logic
def execute_query(query, params):
    with get_database_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()

def save_user(user_data):
    execute_query("INSERT INTO users...", user_data)

def save_order(order_data):
    execute_query("INSERT INTO orders...", order_data)
```

## Testing Considerations

### Write Testable Code

```python
# ❌ Hard to test (mixes I/O with logic)
def process_file():
    with open('data.json') as f:
        data = json.load(f)
    result = data['value'] * 2
    print(result)

# ✅ Testable (pure function)
def calculate_result(data):
    return data['value'] * 2

def process_file():
    data = load_json_file('data.json')
    result = calculate_result(data)
    print(result)
```

## Language-Specific Guides

For detailed patterns in specific languages:
- **Python**: [code_quality.md](code_quality.md) - Black, Ruff, mypy
- **Multi-language**: [multi_language_guide.md](multi_language_guide.md) - Python, JS, Go, Rust

## Related Guides

- [code_quality.md](code_quality.md) - Python linting and formatting tools
- [testing_strategies.md](testing_strategies.md) - Testing best practices
- [multi_language_guide.md](multi_language_guide.md) - Language-specific patterns
- [project_structure.md](project_structure.md) - File organization
- [rich_formatting.md](rich_formatting.md) - Enhanced terminal output for CLI tools
