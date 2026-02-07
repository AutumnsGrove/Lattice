"""Encrypted secrets vault for agent-safe secret management.

Secrets are stored encrypted at ~/.grove/secrets.enc using Fernet symmetric
encryption. The encryption key is derived from a master password.

Security Model:
- Secrets never appear in command output
- Agent commands (apply, sync) work without exposing values
- Human commands (set, delete) require interactive input
- Vault is encrypted at rest
"""

import base64
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet, InvalidToken


@dataclass
class SecretEntry:
    """A secret entry in the vault."""

    name: str
    value: str  # Encrypted value
    created_at: str
    updated_at: str


class VaultError(Exception):
    """Raised when vault operations fail."""

    pass


class SecretsVault:
    """Encrypted secrets vault.

    Stores secrets in ~/.grove/secrets.enc with Fernet encryption.
    The encryption key is derived from a master password using PBKDF2.
    """

    VAULT_VERSION = 1

    def __init__(self, vault_path: Path | None = None):
        """Initialize the vault.

        Args:
            vault_path: Path to the vault file. Defaults to ~/.grove/secrets.enc
        """
        self.vault_path = vault_path or (Path.home() / ".grove" / "secrets.enc")
        self._fernet: Fernet | None = None
        self._secrets: dict[str, dict[str, Any]] = {}
        self._unlocked = False

    @property
    def exists(self) -> bool:
        """Check if the vault file exists."""
        return self.vault_path.exists()

    @property
    def is_unlocked(self) -> bool:
        """Check if the vault is unlocked."""
        return self._unlocked

    def _derive_key(self, password: str, salt: bytes) -> bytes:
        """Derive encryption key from password using PBKDF2."""
        # Use PBKDF2 with SHA256, 100k iterations
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations=100_000,
            dklen=32,
        )
        return base64.urlsafe_b64encode(key)

    def create(self, password: str) -> None:
        """Create a new vault with the given password.

        Args:
            password: Master password for the vault

        Raises:
            VaultError: If vault already exists
        """
        if self.exists:
            raise VaultError("Vault already exists. Use unlock() instead.")

        # Generate random salt
        salt = os.urandom(16)

        # Derive key
        key = self._derive_key(password, salt)
        self._fernet = Fernet(key)

        # Initialize empty secrets
        self._secrets = {}
        self._unlocked = True

        # Save vault
        self._save(salt)

    def unlock(self, password: str) -> None:
        """Unlock an existing vault.

        Args:
            password: Master password for the vault

        Raises:
            VaultError: If vault doesn't exist or password is wrong
        """
        if not self.exists:
            raise VaultError("Vault does not exist. Use create() first.")

        try:
            with open(self.vault_path, "rb") as f:
                data = f.read()
        except IOError as e:
            raise VaultError(f"Failed to read vault: {e}") from e

        # Parse header: version (1 byte) + salt (16 bytes)
        if len(data) < 17:
            raise VaultError("Invalid vault file format")

        version = data[0]
        if version != self.VAULT_VERSION:
            raise VaultError(f"Unsupported vault version: {version}")

        salt = data[1:17]
        encrypted_data = data[17:]

        # Derive key and try to decrypt
        key = self._derive_key(password, salt)
        self._fernet = Fernet(key)

        try:
            decrypted = self._fernet.decrypt(encrypted_data)
            self._secrets = json.loads(decrypted.decode("utf-8"))
            self._unlocked = True
        except InvalidToken:
            self._fernet = None
            raise VaultError("Invalid password")
        except json.JSONDecodeError as e:
            self._fernet = None
            raise VaultError(f"Corrupted vault data: {e}") from e

    def _save(self, salt: bytes | None = None) -> None:
        """Save the vault to disk.

        Args:
            salt: Salt for encryption. If None, reads from existing file.
        """
        if not self._unlocked or self._fernet is None:
            raise VaultError("Vault is not unlocked")

        # If no salt provided, read from existing file
        if salt is None:
            if not self.exists:
                raise VaultError("Cannot save: no salt and vault doesn't exist")
            with open(self.vault_path, "rb") as f:
                data = f.read()
            salt = data[1:17]

        # Encrypt secrets
        encrypted = self._fernet.encrypt(json.dumps(self._secrets).encode("utf-8"))

        # Write: version + salt + encrypted data
        self.vault_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.vault_path, "wb") as f:
            f.write(bytes([self.VAULT_VERSION]))
            f.write(salt)
            f.write(encrypted)

        # Set restrictive permissions (owner read/write only)
        os.chmod(self.vault_path, 0o600)

    def set_secret(self, name: str, value: str) -> None:
        """Store a secret in the vault.

        Args:
            name: Secret name (e.g., "STRIPE_SECRET_KEY")
            value: Secret value

        Raises:
            VaultError: If vault is not unlocked
        """
        if not self._unlocked:
            raise VaultError("Vault is not unlocked")

        now = datetime.now().isoformat()

        if name in self._secrets:
            self._secrets[name]["value"] = value
            self._secrets[name]["updated_at"] = now
        else:
            self._secrets[name] = {
                "value": value,
                "created_at": now,
                "updated_at": now,
            }

        self._save()

    def get_secret(self, name: str) -> str | None:
        """Get a secret value from the vault.

        Args:
            name: Secret name

        Returns:
            Secret value or None if not found

        Raises:
            VaultError: If vault is not unlocked
        """
        if not self._unlocked:
            raise VaultError("Vault is not unlocked")

        entry = self._secrets.get(name)
        if entry:
            return entry["value"]
        return None

    def delete_secret(self, name: str) -> bool:
        """Delete a secret from the vault.

        Args:
            name: Secret name

        Returns:
            True if deleted, False if not found

        Raises:
            VaultError: If vault is not unlocked
        """
        if not self._unlocked:
            raise VaultError("Vault is not unlocked")

        if name in self._secrets:
            del self._secrets[name]
            self._save()
            return True
        return False

    def list_secrets(self) -> list[dict[str, str]]:
        """List all secrets (names and metadata, NOT values).

        Returns:
            List of dicts with name, created_at, updated_at

        Raises:
            VaultError: If vault is not unlocked
        """
        if not self._unlocked:
            raise VaultError("Vault is not unlocked")

        return [
            {
                "name": name,
                "created_at": entry["created_at"],
                "updated_at": entry["updated_at"],
                "deployed_to": entry.get("deployed_to", []),
            }
            for name, entry in sorted(self._secrets.items())
        ]

    def record_deployment(self, name: str, target: str) -> None:
        """Record that a secret was deployed to a target.

        Args:
            name: Secret name
            target: Deployment target (e.g. "grove-zephyr" or "Pages:grove-landing")
        """
        if not self._unlocked:
            raise VaultError("Vault is not unlocked")
        if name not in self._secrets:
            return

        entry = self._secrets[name]
        deployed_to = entry.get("deployed_to", [])
        if target not in deployed_to:
            deployed_to.append(target)
        entry["deployed_to"] = deployed_to
        entry["last_deployed_at"] = datetime.now().isoformat()
        self._save()

    def secret_exists(self, name: str) -> bool:
        """Check if a secret exists.

        Args:
            name: Secret name

        Returns:
            True if exists

        Raises:
            VaultError: If vault is not unlocked
        """
        if not self._unlocked:
            raise VaultError("Vault is not unlocked")

        return name in self._secrets

    def count(self) -> int:
        """Get the number of secrets in the vault.

        Returns:
            Number of secrets

        Raises:
            VaultError: If vault is not unlocked
        """
        if not self._unlocked:
            raise VaultError("Vault is not unlocked")

        return len(self._secrets)


def get_vault_password() -> str:
    """Get vault password from environment or prompt.

    Checks GW_VAULT_PASSWORD environment variable first,
    then prompts interactively.

    Returns:
        Password string
    """
    password = os.environ.get("GW_VAULT_PASSWORD")
    if password:
        return password

    import getpass

    return getpass.getpass("Vault password: ")


def unlock_or_create_vault(password: str | None = None) -> SecretsVault:
    """Unlock existing vault or create new one.

    Args:
        password: Optional password. If not provided, prompts.

    Returns:
        Unlocked SecretsVault instance
    """
    vault = SecretsVault()

    if password is None:
        password = get_vault_password()

    if vault.exists:
        vault.unlock(password)
    else:
        vault.create(password)

    return vault
