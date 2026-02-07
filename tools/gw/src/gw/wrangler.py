"""Wrapper for Wrangler subprocess operations."""

import json
import subprocess
from pathlib import Path
from typing import Any, Optional

from .config import GWConfig


class WranglerError(Exception):
    """Raised when a Wrangler command fails."""

    pass


class Wrangler:
    """Wrapper for Wrangler CLI operations."""

    def __init__(self, config: Optional[GWConfig] = None):
        """Initialize Wrangler wrapper.

        Args:
            config: Grove Wrap configuration
        """
        self.config = config or GWConfig.load()
        self._whoami_cache: Optional[dict[str, Any]] = None

    def is_installed(self) -> bool:
        """Check if Wrangler is installed."""
        try:
            subprocess.run(
                ["wrangler", "--version"],
                capture_output=True,
                check=True,
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def is_authenticated(self) -> bool:
        """Check if Wrangler is authenticated with Cloudflare."""
        try:
            self.whoami()
            return True
        except WranglerError:
            return False

    def whoami(self) -> dict[str, Any]:
        """Get current Cloudflare user information.

        Returns:
            Dictionary with account information

        Raises:
            WranglerError: If command fails
        """
        if self._whoami_cache is not None:
            return self._whoami_cache

        try:
            result = subprocess.run(
                ["wrangler", "whoami", "--json"],
                capture_output=True,
                text=True,
                check=True,
            )
            data = json.loads(result.stdout)
            self._whoami_cache = data
            return data
        except FileNotFoundError as e:
            raise WranglerError("Wrangler is not installed. Install with: npm i -g wrangler") from e
        except subprocess.CalledProcessError as e:
            raise WranglerError(f"Wrangler whoami failed: {e.stderr}") from e
        except json.JSONDecodeError as e:
            raise WranglerError(f"Failed to parse wrangler output: {e}") from e

    def execute(self, args: list[str], use_json: bool = False) -> str:
        """Execute a Wrangler command.

        Args:
            args: Command arguments (without 'wrangler')
            use_json: Add --json flag to command

        Returns:
            Command output

        Raises:
            WranglerError: If command fails
        """
        cmd = ["wrangler"] + args
        if use_json:
            cmd.append("--json")

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
            )
            return result.stdout
        except FileNotFoundError as e:
            raise WranglerError("Wrangler is not installed. Install with: npm i -g wrangler") from e
        except subprocess.CalledProcessError as e:
            raise WranglerError(
                f"Wrangler command failed: {' '.join(cmd)}\n{e.stderr}"
            ) from e

    def get_account_id(self) -> str:
        """Get Cloudflare account ID.

        Returns:
            Account ID string

        Raises:
            WranglerError: If not authenticated
        """
        data = self.whoami()
        if "account" not in data or "id" not in data["account"]:
            raise WranglerError("Account ID not found in whoami response")
        return data["account"]["id"]

    def get_account_name(self) -> str:
        """Get Cloudflare account name.

        Returns:
            Account name string

        Raises:
            WranglerError: If not authenticated
        """
        data = self.whoami()
        if "account" not in data or "name" not in data["account"]:
            raise WranglerError("Account name not found in whoami response")
        return data["account"]["name"]

    def login(self) -> None:
        """Run Wrangler login flow.

        Raises:
            WranglerError: If login fails
        """
        try:
            subprocess.run(
                ["wrangler", "login"],
                check=True,
            )
            # Clear cache after login
            self._whoami_cache = None
        except FileNotFoundError as e:
            raise WranglerError("Wrangler is not installed. Install with: npm i -g wrangler") from e
        except subprocess.CalledProcessError as e:
            raise WranglerError(f"Wrangler login failed: {e}") from e
