# Code Quality Guide

## Overview

This guide covers Python code quality tools for maintaining consistent, readable, and error-free code:

- **Black**: Opinionated code formatter
- **Ruff**: Fast, all-in-one linter (replaces flake8, isort, pylint, and more)
- **mypy**: Static type checker

These tools integrate seamlessly with UV and can be run via pre-commit hooks.

## Tool Comparison

| Tool | Purpose | Speed | Auto-fix | Configuration |
|------|---------|-------|----------|---------------|
| **Black** | Code formatting | Fast | Yes (always) | Minimal |
| **Ruff** | Linting & import sorting | Very Fast (Rust) | Yes (most rules) | Flexible |
| **mypy** | Type checking | Moderate | No | Gradual adoption |

## Quick Reference

```bash
# Installation
uv add --dev black ruff mypy

# Format code with Black
uv run black .
uv run black path/to/file.py

# Lint with Ruff
uv run ruff check .
uv run ruff check --fix .

# Type check with mypy
uv run mypy .
uv run mypy path/to/file.py

# Run all checks
uv run black . && uv run ruff check . && uv run mypy .
```

## Black - Code Formatting

### What Black Does

Black is an uncompromising Python code formatter with zero configuration needed.

**Handles:** Line length (88 chars), indentation, quotes, spacing

**Benefits:** Deterministic formatting, no style debates, cleaner git diffs

### Usage

```bash
uv run black --check .        # Dry run
uv run black .                # Format all files
uv run black --diff .         # Show changes
```

### Configuration

```toml
[tool.black]
line-length = 88
target-version = ['py311']
```

### Example

```python
# Before: def long_func(p1,p2,p3): x=1+2; return {"k":p1,'v':p2}
# After:  def long_func(p1, p2, p3):
#             x = 1 + 2
#             return {"k": p1, "v": p2}
```

## Ruff - Fast Linting

### What Ruff Does

Extremely fast Rust-based linter replacing flake8, isort, pylint, pyupgrade, and 50+ tools.

**Benefits:** 10-100x faster, all-in-one solution, auto-fix most issues

### Usage

```bash
uv run ruff check .               # Check for issues
uv run ruff check --fix .         # Auto-fix
uv run ruff check --show-source . # Show context
```

### Configuration

```toml
[tool.ruff]
line-length = 88
target-version = "py311"
select = ["E", "W", "F", "I", "B", "SIM"]
ignore = ["E501"]  # Black handles line length

[tool.ruff.per-file-ignores]
"__init__.py" = ["F401"]
"tests/*" = ["S101"]
```

### Common Issues

- **F401**: Unused import (auto-fixable)
- **F841**: Unused variable
- **I001**: Import sorting (auto-fixable)
- **B008**: Mutable default argument

## Type Checking with mypy

### What mypy Does

Static type checker catching type errors before runtime. Optional and adoptable gradually.

```python
def greet(name: str) -> str:
    return f"Hello, {name}"

greet(123)  # mypy error: incompatible type "int"
```

### Usage

```bash
uv run mypy .                     # Check all files
uv run mypy --show-error-codes .  # Show error codes
```

### Configuration

```toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true
disallow_untyped_defs = false  # Enable gradually
check_untyped_defs = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### Example

```python
def process(data: list[str]) -> dict[str, int]:
    return {item: len(item) for item in data}

from typing import Optional
def find(user_id: int) -> Optional[dict]:
    return database.get(user_id)
```

### Common Issues

- **Missing return type**: Add `-> Type` to functions
- **Incompatible types**: Wrong parameter type
- **Unhandled None**: Check Optional values
- **Missing type stubs**: Install types-* packages

## Unified Configuration (pyproject.toml)

Place this file in your project root to configure all tools:

```toml
[project]
name = "myproject"
version = "0.1.0"
requires-python = ">=3.11"

[tool.black]
line-length = 88
target-version = ['py311']

[tool.ruff]
line-length = 88
target-version = "py311"
select = ["E", "W", "F", "I", "B", "SIM"]
ignore = ["E501"]  # Black handles line length

[tool.ruff.per-file-ignores]
"__init__.py" = ["F401"]
"tests/*" = ["S101"]

[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = false
check_untyped_defs = true
```

## Pre-commit Hook Integration

For automated code quality enforcement, integrate these tools with pre-commit hooks.

**See detailed setup guide**: `AgentUsage/pre_commit_hooks/setup_guide.md`

**See configuration examples**: `AgentUsage/pre_commit_hooks/examples.md`

Basic `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
```

## IDE Integration

### VS Code

Extensions: Black Formatter, Ruff, Pylance

```json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.codeActionsOnSave": {"source.organizeImports": true}
  }
}
```

**Other editors:** PyCharm (built-in), Vim/Neovim (ALE/LSP), Sublime (LSP-ruff)

## Handling Exceptions

```python
import os  # noqa: F401       # Ignore Ruff rule
# fmt: off                     # Disable Black
matrix = [[1, 2, 3], [4, 5, 6]]
# fmt: on
```

Use sparingly: only for special cases, generated code, or when rules reduce readability.

## Workflow Best Practices

```bash
# Daily development (before commit)
uv run black . && uv run ruff check --fix . && uv run mypy .

# CI/CD (strict, no auto-fix)
uv run black --check . && uv run ruff check . && uv run mypy --strict .
```

**Gradual Adoption:**
1. Start with Black (zero config)
2. Add Ruff (basic rules first)
3. Introduce mypy (lenient initially)

## Related Guides

- **Pre-commit Hooks**: `AgentUsage/pre_commit_hooks/setup_guide.md`
- **Hook Examples**: `AgentUsage/pre_commit_hooks/examples.md`
- **Testing Strategies**: `AgentUsage/testing_strategies.md`
- **UV Usage**: `AgentUsage/uv_usage.md`
- **Project Structure**: `AgentUsage/project_structure.md`

## Quick Summary

| Tool | Purpose | When to Run | Auto-fix |
|------|---------|-------------|----------|
| Black | Code formatting | Before commit | Yes |
| Ruff | Linting & imports | Before commit | Most issues |
| mypy | Type checking | Before push/CI | No |

**Key Takeaways:**
- Black formats code with zero configuration
- Ruff replaces dozens of linters with one fast tool
- mypy catches type errors before runtime
- Configure all tools in `pyproject.toml`
- Run via `uv run` for consistent dependency management
- Automate with pre-commit hooks (see `pre_commit_hooks/` directory)

These tools work together to maintain high code quality with minimal manual effort.
