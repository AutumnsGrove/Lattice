# Python Testing Guide

## Overview

Testing is essential for maintaining code quality, catching bugs early, and enabling confident refactoring. **pytest** is the de facto standard testing framework for Python, offering simple syntax, powerful fixtures, excellent plugins, and detailed failure reports.

This guide focuses on practical pytest usage with modern Python (3.10+).

**See also**: [testing_javascript.md](testing_javascript.md) for JS/TS testing, [testing_go.md](testing_go.md) for Go, [testing_rust.md](testing_rust.md) for Rust.

---

## Quick Reference

```bash
# Run all tests
uv run pytest

# Run specific test file
uv run pytest tests/test_auth.py

# Run tests matching pattern
uv run pytest -k "test_user"

# Run with coverage
uv run pytest --cov=src --cov-report=html

# Run verbose with output
uv run pytest -v -s

# Run last failed tests
uv run pytest --lf

# Run tests in parallel
uv run pytest -n auto
```

---

## Test Structure: AAA Pattern

The **Arrange-Act-Assert** pattern provides clear, maintainable tests:

```python
def test_user_registration():
    # Arrange - set up test data
    email = "test@example.com"
    password = "secure_pass123"
    user_service = UserService()

    # Act - execute the function
    result = user_service.register(email, password)

    # Assert - verify the outcome
    assert result.success is True
    assert result.user.email == email
```

---

## Fixtures and conftest.py

Fixtures provide reusable setup/teardown code for tests.

```python
# tests/conftest.py
import pytest
from myapp import create_app
from myapp.models import User

@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app("testing")
    yield app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def sample_user():
    """Create a sample user for testing."""
    return User(email="test@example.com", username="testuser")
```

### Using Fixtures

```python
# tests/test_user.py
def test_user_login(client, sample_user):
    response = client.post("/login", json={
        "email": sample_user.email,
        "password": "password123"
    })
    assert response.status_code == 200
```

Place `conftest.py` at the root of your `tests/` directory. Fixtures defined there are automatically available to all tests.

---

## Parametrized Tests

Test multiple inputs efficiently:

```python
import pytest

@pytest.mark.parametrize("email,expected", [
    ("valid@example.com", True),
    ("invalid.email", False),
    ("special+chars@test.co.uk", True),
])
def test_email_validation(email, expected):
    from myapp.validators import is_valid_email
    assert is_valid_email(email) == expected
```

---

## Mocking and Patching

### Essential Patterns

```python
from unittest.mock import Mock, patch

# Mock external API
def test_api_call():
    mock_response = Mock()
    mock_response.json.return_value = {"data": "success"}

    with patch("requests.get", return_value=mock_response):
        from myapp.api import fetch_data
        result = fetch_data("https://api.example.com")
        assert result == {"data": "success"}

# Using pytest-mock (uv add --dev pytest-mock)
def test_database_save(mocker):
    mock_db = mocker.patch("myapp.db.connection")
    mock_db.execute.return_value = True

    from myapp.models import User
    user = User(email="test@example.com")
    assert user.save() is True
    mock_db.execute.assert_called_once()
```

---

## Coverage Tools

```bash
uv add --dev pytest-cov
uv run pytest --cov=src --cov-report=term-missing
uv run pytest --cov=src --cov-report=html
uv run pytest --cov=src --cov-fail-under=80
```

**Target Coverage**: Unit tests 80-90%, Critical paths 100%, Overall project 75-85%

---

## Test Organization

### Directory Structure

```
project/
├── src/
│   ├── models.py
│   ├── services.py
│   └── utils.py
├── tests/
│   ├── conftest.py
│   ├── unit/
│   │   ├── test_models.py
│   │   └── test_utils.py
│   ├── integration/
│   │   └── test_api.py
│   └── e2e/
│       └── test_workflows.py
└── pyproject.toml
```

### Test Types with Examples

#### Unit Test: Isolated Function

```python
# tests/unit/test_utils.py
def test_password_hashing():
    from myapp.utils import hash_password, verify_password

    password = "secure_pass123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_pass", hashed) is False
```

#### Integration Test: Component Interaction

```python
# tests/integration/test_api.py
def test_user_registration_flow(client, db_session):
    response = client.post("/api/register", json={
        "email": "newuser@example.com",
        "password": "secure_pass123"
    })
    assert response.status_code == 201

    # Verify database record
    from myapp.models import User
    user = db_session.query(User).filter_by(
        email="newuser@example.com"
    ).first()
    assert user is not None
```

#### E2E Test: Complete Workflow

```python
# tests/e2e/test_workflows.py
def test_checkout_workflow(client):
    # Register and login
    client.post("/api/register", json={
        "email": "buyer@example.com", "password": "pass123"
    })
    login_resp = client.post("/api/login", json={
        "email": "buyer@example.com", "password": "pass123"
    })
    token = login_resp.json["token"]

    # Add to cart and checkout
    client.post("/api/cart/add",
        headers={"Authorization": f"Bearer {token}"},
        json={"product_id": 1, "quantity": 2}
    )
    checkout_resp = client.post("/api/checkout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert checkout_resp.status_code == 200
```

### Naming Conventions

- Test files: `test_*.py`
- Test functions: `test_*`
- Test classes: `Test*`

---

## Running Tests with UV

```bash
# Run all tests
uv run pytest

# Specific directory
uv run pytest tests/unit/

# Install dependencies and run
uv sync --group dev && uv run pytest
```

---

## Testing Async Code

```bash
uv add --dev pytest-asyncio
```

```python
import pytest

@pytest.mark.asyncio
async def test_async_api_call():
    from myapp.async_client import fetch_user
    user = await fetch_user(user_id=123)
    assert user.id == 123
```

---

## When to Write Tests

### Test-Driven Development (TDD)

1. Write failing test
2. Implement minimal code to pass
3. Refactor while keeping tests green

### Priority Order

1. **Critical business logic** - payment, authentication
2. **Public APIs** - exposed functions/classes
3. **Complex algorithms** - transformations, calculations
4. **Error handling** - exceptions, validation
5. **Edge cases** - boundaries, null values

---

## Common Patterns

### Testing Exceptions

```python
import pytest

def test_division_by_zero():
    from myapp.calculator import divide
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(10, 0)
```

### Testing File Operations

```python
def test_file_processing(tmp_path):
    test_file = tmp_path / "test.txt"
    test_file.write_text("Hello World")
    from myapp.files import process_file
    result = process_file(str(test_file))
    assert result.word_count == 2
```

### Testing Environment Variables

```python
def test_config_from_env(monkeypatch):
    monkeypatch.setenv("API_KEY", "test_key_123")
    from myapp.config import load_config
    assert load_config().api_key == "test_key_123"
```

---

## Troubleshooting

**Import Errors**: Add `export PYTHONPATH="${PYTHONPATH}:${PWD}/src"` before running pytest

**Fixture Not Found**: Ensure `conftest.py` is in correct location and check fixture scope

**Tests Pass Locally, Fail in CI**: Check hardcoded paths, environment variables, and test isolation

**Slow Tests**: Use `pytest --durations=10` to identify slow tests, or `pytest -n auto` to run in parallel (requires pytest-xdist)

---

## CI/CD Integration

For automated testing in CI/CD pipelines, see [ci_cd_patterns.md](ci_cd_patterns.md).

---

## Related Guides

- **[testing_javascript.md](testing_javascript.md)** - JavaScript/TypeScript testing (Vitest, Jest)
- **[testing_go.md](testing_go.md)** - Go testing
- **[testing_rust.md](testing_rust.md)** - Rust testing
- **[uv_usage.md](uv_usage.md)** - Dependency management
- **[code_quality.md](code_quality.md)** - Linting and formatting
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - CI/CD pipelines
- **[rich_formatting.md](rich_formatting.md)** - Enhanced test output with Rich

---

*Last updated: 2025-11-28*
