# Git Hook Examples and Advanced Usage

## Overview

This guide provides examples of the comprehensive hooks included in BaseProject, customization patterns, and introduces the pre-commit framework for managing hooks across projects.

**What's New:** This template now includes production-ready hooks for Python, JavaScript, Go, multi-language projects, secrets scanning, test automation, and dependency management.

---

## Included Production Hooks

BaseProject now includes these production-ready hooks out of the box:

### Security Hooks

#### pre-commit-secrets-scanner
**Critical security hook** that prevents committing API keys, tokens, and credentials.

**Features:**
- Detects 15+ secret patterns (API keys, tokens, passwords)
- Whitelists template files (`secrets_template.json`)
- Checks for sensitive filenames (`.env`, `credentials.json`)
- Provides actionable remediation steps

**Example output when secret detected:**
```
🔍 Scanning for secrets and sensitive data...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ SECURITY WARNING: Possible secrets detected!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found potential secrets:
  • Anthropic API Key
  • Hardcoded Password

Recommended actions:
  1. Remove the secret from your code
  2. Store in secrets.json (which is gitignored)
  3. Use environment variables for sensitive data
  4. Check AgentUsage/secrets_management.md for guidance
```

---

### Language-Specific Quality Hooks

#### pre-commit-python
Runs Black formatting and Ruff linting on Python files.

**Example output:**
```
📦 Checking Python files...
Files: src/main.py src/utils.py

  Running Black formatter...
  ✓ Black formatting passed

  Running Ruff linter...
  ✓ Ruff linting passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All pre-commit checks passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### pre-commit-javascript
Runs Prettier formatting, ESLint linting, and TypeScript type checking.

**Example output:**
```
📦 Checking JavaScript/TypeScript files...
Files: src/index.ts src/utils.js

  Running Prettier formatter...
  ✓ Prettier formatting passed

  Running ESLint...
  ✓ ESLint passed

  Running TypeScript type check...
  ✓ TypeScript type check passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All pre-commit checks passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### pre-commit-go
Runs gofmt, go vet, golint, and go mod verify.

**Example output:**
```
📦 Checking Go files...
Files: main.go utils.go

  Running gofmt...
  ✓ gofmt formatting passed

  Running go vet...
  ✓ go vet passed

  Running golint...
  ✓ golint passed

  Running go mod verify...
  ✓ go mod verify passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All pre-commit checks passed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### pre-commit-multi-language
Automatically detects and checks Python, JavaScript, Go, Rust, JSON, and YAML files.

**Example output:**
```
🔍 Running multi-language pre-commit checks...

📦 Checking Python files...
  ✓ Black formatting passed
  ✓ Ruff linting passed

📦 Checking JavaScript/TypeScript files...
  ✓ Prettier formatting passed
  ✓ ESLint passed

📦 Validating JSON files...
  ✓ All JSON files valid

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All pre-commit checks passed!
  Checked: 3 language(s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Test Automation Hooks

#### pre-push
Auto-detects and runs tests before pushing to prevent broken builds.

**Example output:**
```
🧪 Running tests before push...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Detected Python project
Running pytest...

tests/test_main.py ✓✓✓✓
tests/test_utils.py ✓✓

✓ Python tests passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All tests passed! Proceeding with push.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Automation & Convenience Hooks

#### post-checkout
Automatically updates dependencies when switching branches.

**Example output:**
```
🔄 Post-checkout: Checking for dependency changes...

📦 Python dependencies changed
  Running 'uv sync'...
  ✓ Python dependencies updated (uv)

📦 Node dependencies changed
  Running 'npm install'...
  ✓ Node dependencies updated (npm)

✅ Dependency updates complete
```

#### prepare-commit-msg
Adds branch context and AI agent attribution to commits automatically.

**Example workflow:**
```bash
# Branch: feature/ABC-123-add-auth
git commit -m "add JWT authentication"

# Hook automatically prepends ticket number:
# [ABC-123] add JWT authentication
#
# 🤖 Generated with Claude Code
# via Happy
#
# Co-Authored-By: [Model Name] <agent@localhost>
# Co-Authored-By: Happy <yesreply@happy.engineering>
```

#### post-commit
Shows commit summary and scans for TODO comments.

**Example output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Commit successful!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Commit Details:

  Hash:    a1b2c3d
  Author:  Your Name
  Message: feat: add user authentication

  Files changed: 3

  src/auth.py    | 45 +++++++++++++++
  tests/test_auth.py | 32 +++++++++++
  README.md      |  5 +++

🔍 Scanning for TODO/FIXME comments in committed files...

  TODO - src/auth.py:23
    # TODO: Add refresh token support
  FIXME - src/auth.py:45
    # FIXME: Handle edge case for expired tokens

Project-wide summary:
  TODO comments:  12
  FIXME comments: 3

💡 Consider updating TODOS.md to track these items

📤 You have 1 commit(s) ready to push
   Run: git push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Additional Hook Ideas

### post-merge Hook
Run database migrations after merging:
```bash
#!/bin/bash
echo "Checking for pending migrations..."
python manage.py migrate --check || python manage.py migrate
```

---

## Customization Examples

All included hooks can be customized for your specific needs. Here are some common modifications:

### Adding Custom Secret Patterns

Edit `pre-commit-secrets-scanner` to add your organization's secret patterns:

```bash
# Add to the PATTERNS array:
declare -A PATTERNS=(
    # ... existing patterns ...
    ["Your Company API Key"]='yc-api-[0-9a-f]{32}'
    ["Internal Token"]='internal_[a-zA-Z0-9]{40}'
)
```

### Customizing Code Quality Rules

**Python (pre-commit-python):**
```bash
# Add mypy type checking
if command -v mypy &> /dev/null; then
    echo "  Running mypy..."
    mypy $python_files || checks_failed=1
fi
```

**JavaScript (pre-commit-javascript):**
```bash
# Add custom ESLint config
eslint --config .eslintrc.custom.json $js_ts_files
```

### Modifying Test Timeout

**pre-push:**
```bash
# Add timeout to prevent hanging tests
timeout 300 pytest tests/ || tests_failed=1  # 5 minute timeout
```

---

## Using the pre-commit Framework

### What is pre-commit?

Pre-commit is a Python package that manages git hooks using a configuration file. It provides:
- Centralized hook configuration
- Easy sharing across projects
- Access to community hooks
- Automatic updates

### Installation

```bash
# Using uv (recommended)
uv add --dev pre-commit

# Or using pip
pip install pre-commit

# Install hooks
pre-commit install
```

### Basic Commands

```bash
# Install hooks for the first time
pre-commit install

# Run hooks manually on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black --all-files

# Update hook versions
pre-commit autoupdate
```

---

## pre-commit Config Example

Complete `.pre-commit-config.yaml`:

```yaml
# .pre-commit-config.yaml
repos:
  # Python code formatting with Black
  - repo: https://github.com/psf/black
    rev: 24.1.1
    hooks:
      - id: black
        language_version: python3.11

  # Python linting with Ruff
  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.1.15
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]

  # General file checks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace      # Remove trailing whitespace
      - id: end-of-file-fixer        # Ensure files end with newline
      - id: check-yaml                # Validate YAML syntax
      - id: check-json                # Validate JSON syntax
      - id: check-added-large-files  # Prevent large files
        args: [--maxkb=1000]
      - id: mixed-line-ending        # Prevent mixed line endings
        args: [--fix=lf]

  # Type checking with mypy
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
```

---

## When to Use Framework vs Custom Scripts

### Use pre-commit Framework When:
- Working with Python projects
- Need standard code quality tools (Black, Ruff, mypy)
- Want to share configuration across projects
- Team collaboration is important
- Need automatic tool updates

### Use Custom Scripts When:
- Project-specific logic required
- Non-standard workflows
- Language-specific tools not in framework
- Simple, one-off hooks
- Want complete control

### Hybrid Approach:
Combine both! Use pre-commit for standard tools, custom scripts for project-specific needs:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/psf/black
    rev: 24.1.1
    hooks:
      - id: black

  # Custom local hook
  - repo: local
    hooks:
      - id: custom-check
        name: Custom validation
        entry: ./scripts/custom_hook.sh
        language: system
```

---

## Custom Hook Patterns

### Common Structure

```bash
#!/bin/bash
# Hook name and description

# 1. Print what you're doing
echo "Running [hook name]..."

# 2. Perform checks/operations
# ... your logic here ...

# 3. Exit with appropriate code
if [ $? -eq 0 ]; then
    echo "✅ Success message"
    exit 0
else
    echo "❌ Error message"
    echo "Instructions to fix"
    exit 1
fi
```

### Best Practices

1. **Fast execution**: Hooks run frequently, keep them quick
2. **Clear output**: Users should understand what's happening
3. **Actionable errors**: Tell users how to fix issues
4. **Fail gracefully**: Handle missing dependencies
5. **Document behavior**: Add comments explaining logic

### Template

```bash
#!/bin/bash
# Description: [What this hook does]
# When it runs: [pre-commit, pre-push, etc.]

set -e  # Exit on error

HOOK_NAME="[Your Hook Name]"

echo "Running $HOOK_NAME..."

# Main logic
function main() {
    # Your checks here

    if [[ -z "$REQUIRED_VAR" ]]; then
        echo "❌ Error: Missing required configuration"
        return 1
    fi

    # Success
    echo "✅ $HOOK_NAME passed"
    return 0
}

# Run and capture result
main
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "Fix the issues above and try again."
fi

exit $EXIT_CODE
```

---

## Related Guides

- [Setup Guide](setup_guide.md) - Initial hook installation
- [Code Quality Guide](code_quality.md) - Code formatting hooks
- [Testing Strategies](testing_strategies.md) - Test-related hooks
