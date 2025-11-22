# Advanced Secrets Management

## Overview

This guide covers advanced patterns for secrets management in production environments. For basic usage, see [secrets_management.md](secrets_management.md).

**Topics Covered:**
- Advanced loading patterns with validation
- .env file integration
- Automated testing strategies
- Emergency key rotation procedures
- Production deployment patterns

---

## Advanced Loading Patterns

### SecretsManager Class

For complex applications requiring validation and multiple fallback mechanisms:

```python
import os
import json
from pathlib import Path
from typing import Dict, Optional

class SecretsManager:
    """Manages application secrets with validation and fallback support."""

    def __init__(self, secrets_file: str = "secrets.json"):
        self.secrets_path = Path(__file__).parent / secrets_file
        self._secrets: Dict[str, str] = {}
        self._load_secrets()

    def _load_secrets(self) -> None:
        """Load secrets from file with error handling."""
        if not self.secrets_path.exists():
            print(f"Warning: {self.secrets_path} not found. Using environment variables.")
            return

        try:
            with open(self.secrets_path, 'r') as f:
                self._secrets = json.load(f)
            print(f"Loaded secrets from {self.secrets_path}")
        except json.JSONDecodeError as e:
            print(f"Error parsing {self.secrets_path}: {e}")
        except Exception as e:
            print(f"Unexpected error loading secrets: {e}")

    def get(self, key: str, env_var: Optional[str] = None, default: str = "") -> str:
        """
        Get secret value with environment variable fallback.

        Args:
            key: Secret key name in secrets.json
            env_var: Environment variable name (defaults to uppercase key)
            default: Default value if not found

        Returns:
            Secret value or default
        """
        # Try secrets file first
        if key in self._secrets:
            return self._secrets[key]

        # Fallback to environment variable
        env_var = env_var or key.upper()
        value = os.getenv(env_var, default)

        if not value:
            print(f"Warning: Secret '{key}' not found in file or environment")

        return value

    def validate_required(self, *keys: str) -> bool:
        """
        Validate that required secrets are present.

        Args:
            *keys: Required secret keys

        Returns:
            True if all required secrets are present
        """
        missing = []
        for key in keys:
            if not self.get(key):
                missing.append(key)

        if missing:
            print(f"Missing required secrets: {', '.join(missing)}")
            return False

        return True

# Usage
secrets = SecretsManager()
ANTHROPIC_API_KEY = secrets.get("anthropic_api_key", "ANTHROPIC_API_KEY")

# Validate required keys on startup
if not secrets.validate_required("anthropic_api_key", "openrouter_api_key"):
    raise ValueError("Missing required API keys")
```

---

## .env File Integration

### Using python-dotenv

For environments that prefer dotenv files:

**Installation:**
```bash
pip install python-dotenv
# or with uv
uv add python-dotenv
```

**.env File:**
```bash
# API Keys
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Application Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
```

**Loading .env:**
```python
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Access variables
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"
```

### Hybrid Approach (secrets.json + .env)

```python
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional

# Load .env first
load_dotenv()

def load_secrets():
    """Load from secrets.json, fallback to .env, then environment."""
    secrets_path = Path(__file__).parent / "secrets.json"

    if secrets_path.exists():
        try:
            with open(secrets_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error parsing secrets.json: {e}")

    return {}

SECRETS = load_secrets()

def get_secret(key: str, env_var: Optional[str] = None) -> str:
    """Get secret with triple fallback: secrets.json -> .env -> environment."""
    # Try secrets.json first
    if key in SECRETS:
        return SECRETS[key]

    # Try environment variable (includes .env via load_dotenv)
    env_var = env_var or key.upper()
    return os.getenv(env_var, "")

# Usage
ANTHROPIC_API_KEY = get_secret("anthropic_api_key", "ANTHROPIC_API_KEY")
```

---

## Automated Testing

### Unit Test Example

```python
import unittest
import os
import json
from pathlib import Path
from unittest.mock import patch, mock_open

class TestSecretsLoading(unittest.TestCase):

    def test_load_valid_secrets(self):
        """Test loading valid secrets.json."""
        mock_secrets = '{"anthropic_api_key": "test-key"}'
        with patch('builtins.open', mock_open(read_data=mock_secrets)):
            secrets = load_secrets()
            self.assertEqual(secrets["anthropic_api_key"], "test-key")

    def test_missing_secrets_file(self):
        """Test fallback when secrets.json is missing."""
        with patch('builtins.open', side_effect=FileNotFoundError):
            secrets = load_secrets()
            self.assertEqual(secrets, {})

    def test_malformed_json(self):
        """Test error handling for malformed JSON."""
        with patch('builtins.open', mock_open(read_data='invalid')):
            secrets = load_secrets()
            self.assertEqual(secrets, {})

    @patch.dict(os.environ, {"ANTHROPIC_API_KEY": "env-key"})
    def test_environment_fallback(self):
        """Test environment variable fallback."""
        with patch('builtins.open', side_effect=FileNotFoundError):
            secrets = load_secrets()
            api_key = secrets.get("anthropic_api_key", os.getenv("ANTHROPIC_API_KEY", ""))
            self.assertEqual(api_key, "env-key")

if __name__ == "__main__":
    unittest.main()
```

### Integration Testing

```python
def test_api_connection(api_key: str) -> bool:
    """Test if API key is valid by making a simple request."""
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
        # Make minimal request to validate key
        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=10,
            messages=[{"role": "user", "content": "test"}]
        )
        print("✓ API key is valid and working")
        return True
    except Exception as e:
        print(f"✗ API key validation failed: {e}")
        return False

# Test during development
if __name__ == "__main__":
    api_key = SECRETS.get("anthropic_api_key", os.getenv("ANTHROPIC_API_KEY", ""))
    if api_key:
        test_api_connection(api_key)
```

---

## Emergency Key Rotation

If API keys are compromised or potentially exposed:

### Immediate Actions

1. **Immediately revoke old keys at the provider**
   - Anthropic: https://console.anthropic.com/settings/keys
   - OpenRouter: https://openrouter.ai/keys
   - OpenAI: https://platform.openai.com/api-keys
   - Delete or disable the compromised key immediately

2. **Generate new keys**
   - Create replacement keys with appropriate permissions
   - Use descriptive names (e.g., "production-app-2025-10")
   - Copy new keys to secure location

3. **Update all `secrets.json` files**
   ```bash
   # Find all secrets.json files
   find . -name "secrets.json" -type f

   # Update each one
   # Edit manually or use script below
   python rotate_keys.py --key anthropic_api_key --value "new-key"
   ```

4. **Update any environment variables**
   ```bash
   # Update in shell config
   sed -i.bak 's/old-key/new-key/g' ~/.zshrc
   source ~/.zshrc

   # Update in deployment environments
   # - CI/CD secrets (GitHub, GitLab, etc.)
   # - Cloud provider secret managers
   # - Container orchestration secrets
   ```

5. **Test all affected applications**
   ```bash
   # Run test suite
   pytest tests/

   # Test API connections
   python -c "from main import test_api_connection; test_api_connection()"

   # Verify production applications
   # - Check logs for authentication errors
   # - Monitor API usage dashboards
   # - Test critical user flows
   ```

### Key Rotation Script

```python
#!/usr/bin/env python3
"""
Script to safely rotate API keys in secrets.json files.
"""

import json
import sys
from pathlib import Path
from typing import List

def find_secrets_files(root_dir: Path = Path(".")) -> List[Path]:
    """Find all secrets.json files in directory tree."""
    return list(root_dir.rglob("secrets.json"))

def rotate_key(secrets_file: Path, key_name: str, new_value: str) -> bool:
    """
    Rotate a specific key in secrets.json file.

    Args:
        secrets_file: Path to secrets.json
        key_name: Name of key to rotate
        new_value: New key value

    Returns:
        True if successful
    """
    try:
        # Read existing secrets
        with open(secrets_file, 'r') as f:
            secrets = json.load(f)

        # Update key
        old_value = secrets.get(key_name, "")
        secrets[key_name] = new_value

        # Write back
        with open(secrets_file, 'w') as f:
            json.dump(secrets, f, indent=2)

        print(f"✓ Updated {key_name} in {secrets_file}")
        if old_value:
            print(f"  Old: {old_value[:10]}...")
        print(f"  New: {new_value[:10]}...")

        return True

    except Exception as e:
        print(f"✗ Failed to update {secrets_file}: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: python rotate_keys.py <key_name> <new_value>")
        sys.exit(1)

    key_name = sys.argv[1]
    new_value = sys.argv[2]

    # Find all secrets files
    secrets_files = find_secrets_files()

    if not secrets_files:
        print("No secrets.json files found")
        sys.exit(1)

    print(f"Found {len(secrets_files)} secrets.json files")
    print(f"Rotating key: {key_name}\n")

    # Confirm
    response = input("Continue? [y/N]: ")
    if response.lower() != 'y':
        print("Aborted")
        sys.exit(0)

    # Rotate keys
    success_count = 0
    for secrets_file in secrets_files:
        if rotate_key(secrets_file, key_name, new_value):
            success_count += 1

    print(f"\n✓ Successfully updated {success_count}/{len(secrets_files)} files")

if __name__ == "__main__":
    main()
```

### Prevention Checklist

After rotation, verify:
- [ ] Old keys are completely revoked
- [ ] New keys work in all environments
- [ ] No hardcoded old keys remain in code
- [ ] Git history doesn't contain exposed keys
- [ ] Team members have updated their local copies
- [ ] Documentation is updated
- [ ] Monitoring is in place for future detection

---

## Production Deployment Patterns

### Cloud Secret Management

**AWS Secrets Manager:**
```python
import boto3
import json

def get_secret_aws(secret_name: str, region: str = "us-east-1"):
    """Retrieve secret from AWS Secrets Manager."""
    client = boto3.client('secretsmanager', region_name=region)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        return json.loads(response['SecretString'])
    except Exception as e:
        print(f"Error retrieving secret: {e}")
        return {}

# Usage
secrets = get_secret_aws("production/api-keys")
ANTHROPIC_API_KEY = secrets.get("anthropic_api_key")
```

**Google Cloud Secret Manager:**
```python
from google.cloud import secretmanager

def get_secret_gcp(project_id: str, secret_id: str, version: str = "latest"):
    """Retrieve secret from GCP Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"

    try:
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode('UTF-8')
    except Exception as e:
        print(f"Error retrieving secret: {e}")
        return ""

# Usage
ANTHROPIC_API_KEY = get_secret_gcp("my-project", "anthropic-api-key")
```

### Environment-Specific Configuration

```python
import os
from enum import Enum

class Environment(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class Config:
    def __init__(self):
        self.env = Environment(os.getenv("APP_ENV", "development"))
        self._load_secrets()

    def _load_secrets(self):
        """Load secrets based on environment."""
        if self.env == Environment.DEVELOPMENT:
            # Local secrets.json
            self.secrets = load_secrets()
        elif self.env == Environment.STAGING:
            # Cloud secret manager (staging)
            self.secrets = get_secret_aws("staging/api-keys")
        elif self.env == Environment.PRODUCTION:
            # Cloud secret manager (production)
            self.secrets = get_secret_aws("production/api-keys")

    def get(self, key: str, default: str = ""):
        return self.secrets.get(key, os.getenv(key.upper(), default))

config = Config()
```

---

## Security Monitoring

### Detecting Secret Exposure

**Using git-secrets:**
```bash
# Install
brew install git-secrets

# Setup
git secrets --install
git secrets --register-aws

# Scan repository
git secrets --scan
```

**Using detect-secrets:**
```bash
# Install
pip install detect-secrets

# Create baseline
detect-secrets scan > .secrets.baseline

# Audit findings
detect-secrets audit .secrets.baseline
```

**Pre-commit hook (.pre-commit-config.yaml):**
```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

---

## Related Guides

- **[secrets_management.md](secrets_management.md)** - Basic secrets management patterns
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - CI/CD environment variables and secrets
- **[docker_guide.md](docker_guide.md)** - Container secrets management

---

## Additional Resources

- **OWASP Secrets Management Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- **12 Factor App - Config**: https://12factor.net/config
- **AWS Secrets Manager**: https://aws.amazon.com/secrets-manager/
- **GCP Secret Manager**: https://cloud.google.com/secret-manager
- **Azure Key Vault**: https://azure.microsoft.com/en-us/products/key-vault

---

*Last updated: 2025-10-19*
