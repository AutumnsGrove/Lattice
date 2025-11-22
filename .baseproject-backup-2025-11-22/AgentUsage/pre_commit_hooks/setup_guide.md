# Git Pre-Commit Hooks Setup Guide

## Overview

Git hooks are scripts that automatically run at specific points in your Git workflow. They help maintain code quality, enforce standards, and catch issues before they enter your repository. This guide covers installing and using the comprehensive hooks provided in this template.

**New in this version:** Multi-language support, secrets scanning, automatic dependency management, and branch context injection.

## Quick Reference

```bash
# RECOMMENDED: Use the installer script (interactive)
./AgentUsage/pre_commit_hooks/install_hooks.sh

# OR: Manual installation for specific language
# Python project:
cp AgentUsage/pre_commit_hooks/commit-msg .git/hooks/
cp AgentUsage/pre_commit_hooks/pre-commit-python .git/hooks/pre-commit
cp AgentUsage/pre_commit_hooks/pre-commit-secrets-scanner .git/hooks/pre-commit-secrets
cp AgentUsage/pre_commit_hooks/pre-push .git/hooks/
chmod +x .git/hooks/*

# JavaScript project:
cp AgentUsage/pre_commit_hooks/commit-msg .git/hooks/
cp AgentUsage/pre_commit_hooks/pre-commit-javascript .git/hooks/pre-commit
cp AgentUsage/pre_commit_hooks/pre-commit-secrets-scanner .git/hooks/pre-commit-secrets
cp AgentUsage/pre_commit_hooks/pre-push .git/hooks/
chmod +x .git/hooks/*

# Multi-language project:
cp AgentUsage/pre_commit_hooks/commit-msg .git/hooks/
cp AgentUsage/pre_commit_hooks/pre-commit-multi-language .git/hooks/pre-commit
cp AgentUsage/pre_commit_hooks/pre-commit-secrets-scanner .git/hooks/pre-commit-secrets
cp AgentUsage/pre_commit_hooks/pre-push .git/hooks/
chmod +x .git/hooks/*

# Test without committing
.git/hooks/pre-commit
```

## What Are Git Hooks

Git hooks are executable scripts that Git runs automatically when certain events occur:

- **pre-commit**: Runs before a commit is created (code quality checks)
- **commit-msg**: Validates commit message format
- **pre-push**: Runs before pushing to remote (comprehensive tests)
- **post-commit**: Runs after a commit is created (notifications)

Hooks live in `.git/hooks/` and must be executable. They exit with code 0 (success) or non-zero (failure) to allow or block the Git operation.

## Hook Selection Matrix

Choose the right hooks for your project:

| Project Type | Pre-Commit Hook | Additional Hooks | Security |
|-------------|-----------------|------------------|----------|
| **Python** | `pre-commit-python` | `pre-push`, `post-checkout` | `pre-commit-secrets-scanner` |
| **JavaScript/Node** | `pre-commit-javascript` | `pre-push`, `post-checkout` | `pre-commit-secrets-scanner` |
| **Go** | `pre-commit-go` | `pre-push`, `post-checkout` | `pre-commit-secrets-scanner` |
| **Rust** | `pre-commit-multi-language` | `pre-push`, `post-checkout` | `pre-commit-secrets-scanner` |
| **Multi-language** | `pre-commit-multi-language` | `pre-push`, `post-checkout` | `pre-commit-secrets-scanner` |
| **Any project** | N/A (optional) | N/A | `pre-commit-secrets-scanner` ⭐ |

**Always install:** `commit-msg` (validates commit format)
**Highly recommended:** `pre-commit-secrets-scanner` (prevents leaked secrets)
**Optional:** `prepare-commit-msg`, `post-commit` (convenience features)

---

## Installation and Activation

### Approach 1: Interactive Installer (Recommended)

The easiest way to install hooks is using the interactive installer script:

```bash
# Navigate to your project root
cd /path/to/your/project

# Run the installer
./AgentUsage/pre_commit_hooks/install_hooks.sh
```

The installer will:
1. Auto-detect your project type (Python, JavaScript, Go, etc.)
2. Recommend appropriate hooks
3. Back up existing hooks
4. Install selected hooks
5. Make them executable
6. Verify installation

### Approach 2: Manual Installation

For more control, manually copy specific hooks:

```bash
# Navigate to your project root
cd /path/to/your/project

# Example: Python project
cp AgentUsage/pre_commit_hooks/commit-msg .git/hooks/
cp AgentUsage/pre_commit_hooks/pre-commit-python .git/hooks/pre-commit
cp AgentUsage/pre_commit_hooks/pre-commit-secrets-scanner .git/hooks/pre-commit-secrets
cp AgentUsage/pre_commit_hooks/pre-push .git/hooks/
cp AgentUsage/pre_commit_hooks/post-checkout .git/hooks/

# Make them executable
chmod +x .git/hooks/*

# Verify installation
ls -l .git/hooks/
```

### Testing Your Installation

```bash
# Test pre-commit hook directly
.git/hooks/pre-commit

# Test commit-msg hook with sample message
echo "test commit message" | .git/hooks/commit-msg .git/COMMIT_EDITMSG

# Make a test commit to verify
git add .
git commit -m "Test: verify hooks are working"
```

## Available Hooks in This Template

### Core Hooks (Recommended for All Projects)

#### commit-msg
Validates commit message format according to conventional commits:
- Checks for proper commit types (feat, fix, docs, etc.)
- Validates message structure
- Supports both conventional and custom formats
- See `AgentUsage/git_guide.md` for format details

#### pre-commit-secrets-scanner
**CRITICAL SECURITY**: Scans for API keys and secrets before commit:
- Detects Anthropic, OpenAI, AWS, GitHub tokens
- Prevents accidental exposure of credentials
- Checks for hardcoded passwords
- Whitelists template files like `secrets_template.json`
- **Recommended for ALL projects**

### Language-Specific Pre-Commit Hooks

#### pre-commit-python
Python code quality checks:
- **Black**: Code formatting
- **Ruff**: Fast linting
- Runs only on staged `.py` files
- Auto-formats when possible

#### pre-commit-javascript
JavaScript/TypeScript code quality checks:
- **Prettier**: Code formatting
- **ESLint**: Linting and style rules
- **TypeScript**: Type checking (if `tsconfig.json` present)
- Supports `.js`, `.jsx`, `.ts`, `.tsx` files

#### pre-commit-go
Go code quality checks:
- **gofmt**: Code formatting
- **go vet**: Static analysis
- **golint**: Style suggestions (optional)
- **goimports**: Import management (if installed)
- **go mod verify**: Dependency verification

#### pre-commit-multi-language
Comprehensive checks for mixed-language projects:
- Detects file types automatically
- Runs appropriate tools per language
- Validates JSON and YAML syntax
- Ideal for polyglot codebases

### Test & Deploy Hooks

#### pre-push
Runs tests before pushing to remote:
- Auto-detects test framework (pytest, npm test, go test, cargo test)
- Prevents broken code from reaching remote
- Non-blocking if no tests configured
- **Recommended for all projects with tests**

### Automation Hooks

#### post-checkout
Auto-updates dependencies when switching branches:
- Detects changes in `package.json`, `pyproject.toml`, `go.mod`, etc.
- Runs appropriate package manager (npm, uv, go mod, cargo)
- Saves time and prevents "works on my branch" issues
- **Recommended for team projects**

#### prepare-commit-msg
Adds context to commit messages automatically:
- Extracts ticket number from branch name (ABC-123, #456)
- Adds branch context to commits
- Includes Claude co-authorship attribution
- **Optional but useful for ticket-based workflows**

#### post-commit
Shows commit summary and scans for TODOs:
- Displays commit details and stats
- Scans committed files for TODO/FIXME comments
- Shows project-wide TODO count
- Reminds about pending push
- **Optional, informational only**

See `examples.md` for more hook examples and customization options.

## Hook Execution Order

When you run `git commit`:

1. **pre-commit** runs first
   - Checks staged files
   - Runs formatters/linters
   - Exits if critical issues found

2. **commit-msg** runs next
   - Validates commit message
   - Checks format and structure
   - Can modify message automatically

3. **post-commit** runs last (if present)
   - Runs after commit succeeds
   - Cannot prevent commit
   - Used for notifications

## Testing Hooks

### Run Hooks Manually

```bash
# Test pre-commit on staged files
.git/hooks/pre-commit

# Test commit-msg validation
echo "Invalid message" > test_msg.txt
.git/hooks/commit-msg test_msg.txt
rm test_msg.txt
```

### Test Full Workflow

```bash
# Stage a Python file with issues
echo "x=1+2" > test.py
git add test.py

# Try to commit (pre-commit should format it)
git commit -m "Test: checking pre-commit hook"

# Check if file was formatted
cat test.py  # Should show: x = 1 + 2
```

### Bypass Hooks (Use Sparingly)

```bash
# Skip all hooks for this commit
git commit --no-verify -m "Emergency fix"

# Only use when:
# - Emergency production fixes needed
# - Hook is malfunctioning
# - Intentional policy override
```

## Troubleshooting

### Hook Not Running

```bash
# Check if hook exists
ls -l .git/hooks/

# Verify it's executable
chmod +x .git/hooks/pre-commit

# Check for syntax errors
bash -n .git/hooks/pre-commit
```

### Permission Denied

```bash
# Fix permissions
chmod +x .git/hooks/*

# Verify
ls -l .git/hooks/
```

### Hook Fails Unexpectedly

```bash
# Run with debug output
bash -x .git/hooks/pre-commit

# Check Python/UV availability
which python3
which uv
which black
which ruff
```

### Failed Quality Checks

```bash
# Run tools manually to see full output
black --check .
ruff check .

# Fix issues
black .
ruff check --fix .

# Try commit again
git commit -m "Your message"
```

## Integration with UV and Python Projects

### Using UV in Hooks

```bash
# Install tools via UV
uv pip install black ruff

# Or use UV run in hooks
uv run black .
uv run ruff check .
```

### Environment Considerations

Hooks run in Git's environment, not your shell's:
- May not have your virtualenv active
- PATH might be limited
- Use absolute paths or UV for reliability

```bash
# Good: Uses UV to ensure tools available
uv run black "$file"

# Good: Absolute path
/usr/local/bin/black "$file"

# Risky: Depends on PATH
black "$file"
```

## Related Guides

- **git_guide.md**: Commit message standards and workflow
- **code_quality.md**: Code quality tools and standards
- **examples.md**: Additional hook examples and customization
