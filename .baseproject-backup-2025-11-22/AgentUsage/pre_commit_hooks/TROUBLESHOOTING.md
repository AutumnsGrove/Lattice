# Git Hooks Troubleshooting

Quick fixes for common hook issues.

---

## Hook Not Running

```bash
# Check if hook exists and is executable
ls -l .git/hooks/pre-commit

# Fix permissions
chmod +x .git/hooks/*
```

---

## "Command not found" Errors

**Black/Ruff not found (Python):**
```bash
pip install black ruff
# or
uv add --dev black ruff
```

**Prettier/ESLint not found (JavaScript):**
```bash
npm install -D prettier eslint
```

**gofmt not found (Go):**
```bash
# gofmt comes with Go, install Go first
brew install go  # macOS
```

---

## Commit Blocked - Format Issues

**Python:**
```bash
# Auto-fix formatting
black .
ruff check --fix .

# Try commit again
git commit -m "your message"
```

**JavaScript:**
```bash
# Auto-fix formatting
npx prettier --write .
npx eslint --fix .

# Try commit again
git commit -m "your message"
```

**Go:**
```bash
# Auto-fix formatting
gofmt -w .

# Try commit again
git commit -m "your message"
```

---

## Commit Blocked - Secrets Detected

```bash
# 1. Remove the secret from staged files
git restore --staged <file>

# 2. Move secret to secrets.json (gitignored)
echo '{"api_key": "sk-ant-..."}' > secrets.json

# 3. Update code to load from secrets.json
# See AgentUsage/secrets_management.md

# 4. Stage and commit again
git add .
git commit -m "your message"
```

**False positive?** Edit `.git/hooks/pre-commit-secrets` and add filename to `WHITELIST_FILES` array.

---

## Push Blocked - Tests Failed

```bash
# Run tests locally to see failures
pytest tests/           # Python
npm test                # JavaScript
go test ./...           # Go

# Fix failing tests
# Then try push again
git push
```

---

## Emergency: Need to Commit NOW

```bash
# Skip ALL hooks (use sparingly!)
git commit --no-verify -m "emergency fix"
git push --no-verify

# Remember to fix the issues later!
```

---

## Hook Runs Too Slowly

**pre-push taking too long:**
```bash
# Run only fast tests
# Edit .git/hooks/pre-push and add:
pytest tests/ -m "not slow"  # Mark slow tests with @pytest.mark.slow
npm test -- --testPathIgnorePatterns=e2e  # Skip E2E tests
```

---

## Dependencies Not Auto-Updating (post-checkout)

```bash
# Manually update deps
uv sync              # Python
npm install          # JavaScript
go mod download      # Go

# Check if hook exists
ls -l .git/hooks/post-checkout

# Reinstall hook
cp AgentUsage/pre_commit_hooks/post-checkout .git/hooks/
chmod +x .git/hooks/post-checkout
```

---

## Remove All Hooks

```bash
# Backup first
mv .git/hooks .git/hooks.backup

# Create new hooks dir
mkdir .git/hooks

# Copy back samples
cp .git/hooks.backup/*.sample .git/hooks/ 2>/dev/null || true
```

---

## Re-install Hooks

```bash
# Use installer (recommended)
./AgentUsage/pre_commit_hooks/install_hooks.sh

# Or manually
cp AgentUsage/pre_commit_hooks/commit-msg .git/hooks/
cp AgentUsage/pre_commit_hooks/pre-commit-python .git/hooks/pre-commit
cp AgentUsage/pre_commit_hooks/pre-commit-secrets-scanner .git/hooks/pre-commit-secrets
cp AgentUsage/pre_commit_hooks/pre-push .git/hooks/
chmod +x .git/hooks/*
```

---

## Still Stuck?

1. Check `setup_guide.md` for detailed installation steps
2. Check `examples.md` for hook customization
3. Run hook manually to see full error: `.git/hooks/pre-commit`
4. File an issue at https://github.com/AutumnsGrove/BaseProject/issues
