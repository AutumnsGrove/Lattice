# Secrets Management Guide

## Overview

Proper secrets management prevents credential leaks and keeps your API keys secure. This guide covers the essential patterns for managing API keys and sensitive credentials.

**Quick Start**: Use `secrets.json` for local development with environment variable fallbacks.

**For Advanced Topics**: See [secrets_advanced.md](secrets_advanced.md) for:
- Advanced loading patterns with validation
- .env file integration
- Automated testing
- Emergency key rotation
- Production deployment

---

## Quick Reference

### secrets.json (Recommended)

```json
{
  "anthropic_api_key": "sk-ant-api03-...",
  "openrouter_api_key": "sk-or-v1-...",
  "openai_api_key": "sk-...",
  "comment": "Add your API keys here. Keep this file private."
}
```

### Loading Pattern

```python
import os
import json

def load_secrets():
    """Load API keys from secrets.json file."""
    secrets_path = os.path.join(os.path.dirname(__file__), "secrets.json")
    try:
        with open(secrets_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: secrets.json not found. Using environment variables.")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing secrets.json: {e}")
        return {}

# Load secrets at startup
SECRETS = load_secrets()

# Use with environment variable fallback
API_KEY = SECRETS.get("anthropic_api_key", os.getenv("ANTHROPIC_API_KEY", ""))
```

### Environment Variable Fallback

```bash
# Set in shell
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Or in .env file (requires python-dotenv)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## Setup Process

### 1. Create secrets.json

**In your project root:**
```bash
# Create secrets.json
cat > secrets.json << 'EOF'
{
  "anthropic_api_key": "sk-ant-api03-YOUR_KEY_HERE",
  "openrouter_api_key": "sk-or-v1-YOUR_KEY_HERE",
  "comment": "Replace with your actual API keys"
}
EOF
```

### 2. Add to .gitignore

```bash
# Add to .gitignore IMMEDIATELY
echo "secrets.json" >> .gitignore
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
```

**Verify it's ignored:**
```bash
git status  # secrets.json should NOT appear
```

### 3. Create Template for Team

**secrets_template.json:**
```json
{
  "anthropic_api_key": "sk-ant-api03-YOUR_KEY_HERE",
  "openrouter_api_key": "sk-or-v1-YOUR_KEY_HERE",
  "comment": "Copy this to secrets.json and add your actual keys"
}
```

**Commit the template** (not the actual secrets):
```bash
git add secrets_template.json
git commit -m "Add secrets template for project setup"
```

---

## Basic Loading Implementation

### Simple Script

```python
#!/usr/bin/env python3
import os
import json

def load_secrets():
    """Load secrets from secrets.json with fallback to env vars."""
    try:
        with open("secrets.json", 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

# Load secrets
secrets = load_secrets()

# Get API key with fallback
API_KEY = secrets.get("anthropic_api_key", os.getenv("ANTHROPIC_API_KEY", ""))

if not API_KEY:
    print("Error: No API key found in secrets.json or environment")
    exit(1)

# Use the API key
from anthropic import Anthropic
client = Anthropic(api_key=API_KEY)
```

### Class-Based Application

```python
from pathlib import Path
import json
import os

class Application:
    def __init__(self):
        self.secrets = self._load_secrets()
        self.api_key = self._get_api_key()

    def _load_secrets(self):
        """Load secrets from secrets.json."""
        secrets_path = Path(__file__).parent / "secrets.json"
        if secrets_path.exists():
            with open(secrets_path) as f:
                return json.load(f)
        return {}

    def _get_api_key(self):
        """Get API key with environment fallback."""
        key = self.secrets.get("anthropic_api_key", os.getenv("ANTHROPIC_API_KEY", ""))
        if not key:
            raise ValueError("No API key found")
        return key

    def run(self):
        """Run application logic."""
        from anthropic import Anthropic
        client = Anthropic(api_key=self.api_key)
        # Application logic here

if __name__ == "__main__":
    app = Application()
    app.run()
```

---

## Security Best Practices

### DO ✅

1. **Store keys in secrets.json**
   - Keep in project root
   - Use consistent naming

2. **Add to .gitignore immediately**
   ```bash
   echo "secrets.json" >> .gitignore
   echo ".env" >> .gitignore
   ```

3. **Provide a template file**
   - Commit `secrets_template.json`
   - Include setup instructions in README

4. **Use environment variable fallbacks**
   - Essential for CI/CD
   - Allows flexible deployment

5. **Rotate keys regularly**
   - After team member changes
   - If potentially exposed
   - On regular schedule

### DON'T ❌

1. **Never hardcode API keys**
   ```python
   # BAD
   API_KEY = "sk-ant-api03-actual-key"

   # GOOD
   API_KEY = SECRETS.get("anthropic_api_key", os.getenv("ANTHROPIC_API_KEY", ""))
   ```

2. **Never commit actual keys**
   - Check `.gitignore` before first commit
   - Use `git status` to verify

3. **Never log full API keys**
   ```python
   # BAD
   print(f"Using API key: {API_KEY}")

   # GOOD
   print(f"Using API key: {API_KEY[:10]}..." if API_KEY else "No API key")
   ```

4. **Never share via email/chat**
   - Use secure password managers
   - Use secure file sharing with expiration

---

## Testing Checklist

### Basic Testing

**Test with secrets.json present:**
```bash
# Verify file loads correctly
python -c "from main import load_secrets; print(load_secrets())"
```

**Test with secrets.json missing:**
```bash
# Rename file temporarily
mv secrets.json secrets.json.bak

# Set environment variable
export ANTHROPIC_API_KEY="sk-ant-test-key"

# Verify fallback works
python -c "import os; from main import load_secrets; ..."

# Restore
mv secrets.json.bak secrets.json
```

**Test API connection:**
```python
def test_api_connection(api_key: str) -> bool:
    """Test if API key works."""
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        # Minimal test request
        client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=10,
            messages=[{"role": "user", "content": "test"}]
        )
        print("✓ API key is valid")
        return True
    except Exception as e:
        print(f"✗ API key validation failed: {e}")
        return False
```

---

## Common Issues

### Issue: "secrets.json not found"

**Solution:**
1. Check file exists in correct directory
2. Verify file name is exactly "secrets.json"
3. Check file permissions

### Issue: "JSONDecodeError"

**Solution:**
1. Validate JSON at jsonlint.com
2. Remove trailing commas
3. Use double quotes (not single)

**Example fix:**
```json
# Bad
{
  "key": "value",
}

# Good
{
  "key": "value"
}
```

### Issue: "API key appears invalid"

**Solution:**
1. Check key format:
   - Anthropic: starts with `sk-ant-`
   - OpenRouter: starts with `sk-or-v1-`
   - OpenAI: starts with `sk-`
2. Verify no extra whitespace
3. Confirm key hasn't been revoked
4. Test key at provider dashboard

### Issue: "Environment variable not found"

**Solution:**
```bash
# Verify variable is set
echo $ANTHROPIC_API_KEY

# Set if missing
export ANTHROPIC_API_KEY="sk-ant-..."

# For persistence, add to ~/.zshrc or ~/.bashrc
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
source ~/.zshrc
```

---

## .gitignore Template

```gitignore
# Secrets and credentials
secrets.json
.env
.env.local
*.key
*.pem
credentials.json

# Python
__pycache__/
*.py[cod]
.Python
venv/
env/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## Quick Setup for New Projects

```bash
# 1. Create secrets.json
cat > secrets.json << 'EOF'
{
  "anthropic_api_key": "sk-ant-api03-YOUR_KEY_HERE",
  "comment": "Add your actual API keys here"
}
EOF

# 2. Add to .gitignore
echo "secrets.json" >> .gitignore

# 3. Create template
cp secrets.json secrets_template.json

# 4. Commit template
git add secrets_template.json .gitignore
git commit -m "Add secrets management setup"

# 5. Edit secrets.json with actual keys
# (Do NOT commit this!)
```

---

## Related Guides

- **[secrets_advanced.md](secrets_advanced.md)** - Advanced patterns, testing, rotation
- **[uv_usage.md](uv_usage.md)** - Python package management
- **[docker_guide.md](docker_guide.md)** - Container secrets management
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - CI/CD secrets and environment variables

---

*Last updated: 2025-10-19*
