# CI/CD Patterns for Python/UV Projects

## Overview

Continuous Integration and Continuous Deployment (CI/CD) automates testing, quality checks, and deployment processes. Every push to your repository can trigger automated tests, linting, and builds, catching issues before they reach production.

**When to use CI/CD:**
- Multi-developer projects requiring consistent quality gates
- Open source projects accepting external contributions
- Projects with comprehensive test suites worth automating
- Applications requiring automated deployments
- Any codebase where manual testing becomes tedious

**When to skip CI/CD:**
- Quick prototypes or proof-of-concepts
- Solo projects with simple test requirements
- Learning projects where setup overhead exceeds benefit

## Quick Reference

Basic GitHub Actions workflow structure:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install UV
        run: curl -LsSf https://astral.sh/uv/install.sh | sh
      - name: Run tests
        run: uv run pytest
```

## GitHub Actions Basics

**What are GitHub Actions?**
GitHub Actions are automation workflows that run in response to repository events. They execute on GitHub's servers, providing free CI/CD for public repositories.

**Where workflows live:**
```
your-project/
  .github/
    workflows/
      ci.yml
      release.yml
      lint.yml
```

**Common triggers:**
- `on: push` - Every commit
- `on: pull_request` - PRs only
- `on: [push, pull_request]` - Both
- `on: workflow_dispatch` - Manual trigger
- `on: schedule` - Cron-based triggers

## Python/UV Workflow Example

Complete workflow for a UV-based Python project:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      # Checkout repository code
      - name: Checkout code
        uses: actions/checkout@v4

      # Install UV package manager
      - name: Install UV
        run: curl -LsSf https://astral.sh/uv/install.sh | sh

      # Add UV to PATH
      - name: Add UV to PATH
        run: echo "$HOME/.cargo/bin" >> $GITHUB_PATH

      # Install project dependencies
      - name: Install dependencies
        run: uv sync

      # Run test suite
      - name: Run tests
        run: uv run pytest tests/ -v --cov=src --cov-report=term-missing

      # Run linting checks
      - name: Lint with Ruff
        run: uv run ruff check src/ tests/

      # Check code formatting
      - name: Check formatting with Black
        run: uv run black --check src/ tests/
```

**Explanation:**
- `runs-on: ubuntu-latest` - Uses Ubuntu runner
- `actions/checkout@v4` - Clones your repository
- UV installation via official install script
- `uv sync` - Installs all dependencies from `pyproject.toml`
- `uv run` - Executes commands in UV's virtual environment

## Running Tests in CI

**Basic pytest execution:**

```yaml
- name: Run tests with coverage
  run: |
    uv run pytest tests/ \
      --cov=src \
      --cov-report=xml \
      --cov-report=term-missing \
      --junitxml=junit.xml

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage.xml
    fail_ci_if_error: true
```

**Key options:**
- `--cov=src` - Measure coverage for src directory
- `--cov-report=xml` - Generate XML report for Codecov
- `--junitxml` - Create test results file
- `--verbose` or `-v` - Detailed output

**Test organization:**
```
tests/
  test_unit.py       # Fast unit tests
  test_integration.py # Slower integration tests
```

Run different test suites:
```yaml
- name: Unit tests
  run: uv run pytest tests/test_unit.py -v

- name: Integration tests
  run: uv run pytest tests/test_integration.py -v --slow
```

## Linting and Formatting Checks

**Fail fast on code quality issues:**

```yaml
quality:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Install UV
      run: curl -LsSf https://astral.sh/uv/install.sh | sh

    - name: Add UV to PATH
      run: echo "$HOME/.cargo/bin" >> $GITHUB_PATH

    - name: Install dependencies
      run: uv sync

    - name: Ruff linting
      run: uv run ruff check src/ tests/ --output-format=github

    - name: Black formatting
      run: uv run black --check --diff src/ tests/

    - name: Type checking with mypy
      run: uv run mypy src/
```

**Options explained:**
- `--output-format=github` - Annotates PR with inline errors
- `--check --diff` - Shows what Black would change without modifying
- Separate job ensures quality checks run independently

## Build and Release Automation

**Publishing to PyPI:**

```yaml
name: Publish

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install UV
        run: curl -LsSf https://astral.sh/uv/install.sh | sh

      - name: Build package
        run: uv build

      - name: Publish to PyPI
        env:
          UV_PUBLISH_TOKEN: ${{ secrets.PYPI_TOKEN }}
        run: uv publish --token $UV_PUBLISH_TOKEN
```

**Docker image builds:**

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: user/app:latest,user/app:${{ github.sha }}
```

**When to automate:**
- Package releases to PyPI
- Docker image updates on new releases
- Documentation deployment
- Skip automation for early-stage projects

## Secrets in CI/CD

**Using GitHub Secrets:**

```yaml
- name: Deploy to production
  env:
    API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: uv run python deploy.py
```

**Setting up secrets:**
1. Repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add name (e.g., `ANTHROPIC_API_KEY`) and value
4. Reference in workflows as `${{ secrets.SECRET_NAME }}`

**Best practices:**
- Never commit secrets to repository
- Use separate secrets for different environments
- Rotate secrets regularly
- See [secrets_management.md](secrets_management.md) for details

## Caching Dependencies

**UV cache for faster builds:**

```yaml
- name: Cache UV dependencies
  uses: actions/cache@v3
  with:
    path: |
      ~/.cache/uv
      .venv
    key: ${{ runner.os }}-uv-${{ hashFiles('**/pyproject.toml') }}
    restore-keys: |
      ${{ runner.os }}-uv-

- name: Install dependencies
  run: uv sync
```

**Benefits:**
- 2-5x faster workflow runs
- Reduced GitHub Actions minutes usage
- Cache invalidates when `pyproject.toml` changes
- Automatically cleaned after 7 days of inactivity

## Multi-Environment Testing

**Test across multiple Python versions:**

```yaml
test:
  runs-on: ${{ matrix.os }}
  strategy:
    matrix:
      os: [ubuntu-latest, macos-latest, windows-latest]
      python-version: ['3.10', '3.11', '3.12']

  steps:
    - uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: ${{ matrix.python-version }}

    - name: Install UV
      run: curl -LsSf https://astral.sh/uv/install.sh | sh

    - name: Install dependencies
      run: uv sync

    - name: Run tests
      run: uv run pytest tests/
```

**Matrix strategy:**
- Creates 9 jobs (3 OS × 3 Python versions)
- Runs in parallel for speed
- Ensures cross-platform compatibility
- Can exclude specific combinations:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest]
    python-version: ['3.11', '3.12']
    exclude:
      - os: macos-latest
        python-version: '3.11'
```

## Status Badges

**Add CI status to README:**

```markdown
![CI](https://github.com/username/repo/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

Replace `username/repo` with your GitHub repository path. The badge shows green (passing) or red (failing) based on the latest workflow run.

## When to Use CI/CD

**Automate first:**
1. Running tests on every push
2. Code quality checks (linting, formatting)
3. Security vulnerability scanning

**Automate later:**
1. Deployment to staging/production
2. Docker image building
3. Documentation generation
4. Performance benchmarking

**Personal projects:**
- Start simple with tests + linting
- Add complexity as project matures
- Free for public repositories

**Team projects:**
- Essential for code review process
- Prevents broken code from merging
- Enforces consistent code quality
- Automates repetitive manual tasks

## Related Guides

- [Testing Strategies](testing_strategies.md) - Comprehensive testing guide
- [Code Quality](code_quality.md) - Linting, formatting, and type checking
- [Docker Guide](docker_guide.md) - Containerization patterns
- [Secrets Management](secrets_management.md) - API key security
