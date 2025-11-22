# UV Usage Guide

## Overview

UV is a modern, ultra-fast Python package and project manager written in Rust. It's designed to replace pip, pip-tools, pipx, poetry, pyenv, and virtualenv with a single, unified tool.

### Why Use UV?

- **Speed**: 10-100x faster than pip due to Rust implementation
- **Unified**: One tool for packages, projects, environments, and Python versions
- **Reliable**: Lock files ensure reproducible builds
- **Modern**: Built for modern Python development workflows
- **Compatible**: Drop-in replacement for pip in most cases

### Key Features

- Project initialization and scaffolding
- Automatic virtual environment management
- Fast dependency resolution
- Built-in Python version management
- Lock file generation for reproducibility
- Workspace support for monorepos

---

## Quick Reference

```bash
# Project Management
uv init                           # Create new project
uv init --package my-package      # Create installable package
uv init --app my-app              # Create application project

# Dependency Management
uv add requests                   # Add dependency
uv add --dev pytest               # Add dev dependency
uv add "fastapi>=0.100.0"         # Add with version constraint
uv add --git https://...          # Add from git repository
uv remove package-name            # Remove dependency

# Running Code
uv run script.py                  # Run Python script
uv run python -m module           # Run Python module
uv run pytest                     # Run installed tool
uv run --with httpx script.py     # Run with temporary dependency

# Environment Management
uv sync                           # Sync project dependencies
uv sync --frozen                  # Sync without updating lock
uv lock                           # Update lock file
uv python install 3.12            # Install Python version
uv python list                    # List available Python versions

# Package Installation (pip-like)
uv pip install package            # Install package (in active env)
uv pip install -r requirements.txt
uv pip freeze                     # List installed packages
```

---

## Installation and Setup

**Install UV:**
```bash
# macOS/Linux (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh

# macOS (Homebrew)
brew install uv

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Any platform (via pip)
pip install uv

# Verify installation
uv --version
```

UV works out of the box with no configuration needed. Optional environment variables:
```bash
export UV_PYTHON_PREFERENCE=3.12      # Default Python version
export UV_CACHE_DIR="$HOME/.cache/uv"  # Cache location
```

---

## Creating New Projects

```bash
# Standard application project
uv init my-project
cd my-project

# Package project (for libraries)
uv init --package my-library

# Specify Python version
uv init --python 3.11

# Or set Python version after creation
echo "3.12" > .python-version
uv python install 3.12
```

**Created structure includes:**
- `.python-version`: Python version specification
- `pyproject.toml`: Project configuration
- `.venv/`: Virtual environment (created on first use)
- Sample script or src package layout

---

## Adding Dependencies

```bash
# Add packages
uv add requests fastapi uvicorn

# Add with version constraints
uv add "django>=4.2,<5.0"        # Compatible version range
uv add "requests==2.31.0"        # Exact version
uv add "fastapi[all]"            # With extras

# Add dev dependencies
uv add --dev pytest black ruff

# Add from git
uv add --git https://github.com/user/repo --branch develop

# Remove dependencies
uv remove requests
uv remove --dev pytest
```

This automatically updates `pyproject.toml`, `uv.lock`, and syncs the virtual environment.

---

## Running Scripts

```bash
# Run Python script
uv run script.py

# Run Python script with arguments
uv run script.py --input data.csv --output results.json

# Run Python module or code
uv run python -m http.server 8000
uv run python -c "print('Hello, UV!')"

# Run dev tools (pytest, black, ruff, etc.)
uv run pytest tests/ -v
uv run black .

# Run script with temporary dependency
uv run --with httpx fetch_data.py

# Start Python REPL with project dependencies
uv run python
```

---

## Virtual Environment Management

UV automatically creates and manages virtual environments in `.venv/`:

```bash
# Virtual environment created automatically on first use
uv sync          # First sync
uv add package   # First package add
uv run script.py # First run

# Manual environment operations
uv venv                  # Create explicitly
uv venv --python 3.11    # Create with specific Python version

# Python version management
uv python list           # List available Python versions
uv python install 3.12   # Install specific Python version

# Set Python version for project
echo "3.12" > .python-version

# Manual activation (rarely needed with 'uv run')
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows
```

---

## Lock Files and Reproducibility

The `uv.lock` file (generated automatically) contains exact versions and hashes for reproducible builds:

```bash
# Lock file workflow
uv lock              # Generate/update lock file
uv sync              # Sync from lock file (normal)
uv sync --frozen     # Sync without updating (CI/CD)
uv lock --upgrade-package requests  # Update specific package

# Always commit to version control
git add pyproject.toml uv.lock .python-version

# Add to .gitignore
echo -e ".venv/\n__pycache__/\n*.pyc\n.pytest_cache/" >> .gitignore
```

---

## Common Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `uv init` | Create new project | `uv init my-project` |
| `uv add` | Add dependency | `uv add requests` |
| `uv add --dev` | Add dev dependency | `uv add --dev pytest` |
| `uv remove` | Remove dependency | `uv remove requests` |
| `uv sync` | Sync dependencies | `uv sync` |
| `uv lock` | Update lock file | `uv lock` |
| `uv run` | Run script/command | `uv run script.py` |
| `uv python install` | Install Python version | `uv python install 3.12` |
| `uv python list` | List Python versions | `uv python list` |
| `uv pip install` | Install package (pip-like) | `uv pip install package` |
| `uv pip freeze` | List packages | `uv pip freeze` |
| `uv venv` | Create virtual environment | `uv venv` |
| `uv tree` | Show dependency tree | `uv tree` |
| `uv cache clean` | Clear package cache | `uv cache clean` |

---

## Migration from pip/requirements.txt

**Migrate existing requirements.txt project:**
```bash
# Create new project
uv init my-project
cd my-project

# Import requirements
uv add -r requirements.txt

# Import dev requirements (if separate file)
uv add --dev -r requirements-dev.txt

# Verify and test
uv sync
uv run pytest  # or your test command
```

For detailed migration from poetry/pipenv or other tools, refer to the [official migration guide](https://docs.astral.sh/uv/guides/migration/).

---

## Docker Integration

For comprehensive Docker integration patterns with UV, including basic Dockerfiles, multi-stage builds, and Docker Compose examples, see **[docker_guide.md](docker_guide.md)**.

---

## Troubleshooting

### Common Issues

**1. "No virtual environment found"**
```bash
uv venv  # Create explicitly
# Or use uv run which creates automatically
uv run script.py
```

**2. "Python version not found"**
```bash
uv python install 3.12  # Install required version
# Or specify different version
uv venv --python 3.11
```

**3. "Lock file out of sync"**
```bash
uv lock  # Regenerate lock file
uv sync  # Sync dependencies
```

**4. "Package resolution conflicts"**
```bash
uv tree  # See dependency tree
uv lock --upgrade-package problematic-package  # Update specific package
```

**5. "Slow first run or dependency issues"**
```bash
uv cache clean  # Clear cache and rebuild
uv --verbose add package  # Use verbose mode for debugging
```

---

## Best Practices

- **Commit `uv.lock` and `.python-version`** to version control for reproducible builds
- **Use semantic versioning**: `>=1.0.0,<2.0.0` instead of `*` for dependencies
- **Separate dev dependencies**: Use `--dev` flag for development tools
- **Use `uv run`** instead of manually activating environments
- **Use `--frozen` in CI/CD** pipelines to ensure exact dependency versions
- **Test after dependency changes** before committing
- **Periodically update dependencies** with `uv lock --upgrade`

---

## Related Guides

- **[Docker Guide](docker_guide.md)**: Containerizing UV projects
- **[CI/CD Patterns](ci_cd_patterns.md)**: Automating with UV in pipelines
- **[Project Structure](project_structure.md)**: Organizing Python projects with UV

---

## Resources

- **Official Documentation**: https://docs.astral.sh/uv/
- **GitHub Repository**: https://github.com/astral-sh/uv
- **Migration Guide**: https://docs.astral.sh/uv/guides/migration/
- **Python Version Management**: https://docs.astral.sh/uv/guides/python/

---

*Last Updated: 2025-10-19*
*UV Version: 0.x.x (check with `uv --version`)*
