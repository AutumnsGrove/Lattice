"""
Tests for configuration management.
"""

import json
import os
import pytest
from pathlib import Path

from grove_shutter import config


class TestLoadConfig:
    """Test suite for load_config() and config file handling."""

    def test_load_empty_config(self, tmp_path, monkeypatch):
        """Test loading when no config files exist."""
        # Point config paths to empty temp dir
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")
        monkeypatch.setattr(config, "SECRETS_PATH", tmp_path / "secrets.json")

        result = config.load_config()
        assert result == {}

    def test_load_secrets_json(self, tmp_path, monkeypatch):
        """Test loading from secrets.json."""
        secrets_path = tmp_path / "secrets.json"
        secrets_path.write_text(json.dumps({
            "openrouter_api_key": "sk-test-key-123",
            "tavily_api_key": "tvly-test-456",
            "comment": "This should be ignored"
        }))

        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")
        monkeypatch.setattr(config, "SECRETS_PATH", secrets_path)

        result = config.load_config()
        assert result["openrouter_api_key"] == "sk-test-key-123"
        assert result["tavily_api_key"] == "tvly-test-456"
        assert "comment" not in result

    def test_load_toml_config(self, tmp_path, monkeypatch):
        """Test loading from config.toml."""
        config_path = tmp_path / "config.toml"
        config_path.write_text("""
[api]
openrouter_key = "sk-toml-key"
tavily_key = "tvly-toml-key"

[defaults]
model = "accurate"
max_tokens = 1000
""")

        monkeypatch.setattr(config, "CONFIG_PATH", config_path)
        monkeypatch.setattr(config, "SECRETS_PATH", tmp_path / "secrets.json")

        result = config.load_config()
        assert result["openrouter_api_key"] == "sk-toml-key"
        assert result["tavily_api_key"] == "tvly-toml-key"
        assert result["model"] == "accurate"
        assert result["max_tokens"] == 1000

    def test_secrets_overrides_toml(self, tmp_path, monkeypatch):
        """Test that secrets.json takes priority over config.toml."""
        config_path = tmp_path / "config.toml"
        config_path.write_text("""
[api]
openrouter_key = "sk-toml-key"
""")

        secrets_path = tmp_path / "secrets.json"
        secrets_path.write_text(json.dumps({
            "openrouter_api_key": "sk-secrets-key"
        }))

        monkeypatch.setattr(config, "CONFIG_PATH", config_path)
        monkeypatch.setattr(config, "SECRETS_PATH", secrets_path)

        result = config.load_config()
        # secrets.json is loaded after toml, so it overrides
        assert result["openrouter_api_key"] == "sk-secrets-key"


class TestGetApiKey:
    """Test suite for get_api_key() priority chain."""

    def test_env_var_highest_priority(self, tmp_path, monkeypatch):
        """Test that environment variables take highest priority."""
        # Set up config file with different value
        secrets_path = tmp_path / "secrets.json"
        secrets_path.write_text(json.dumps({
            "openrouter_api_key": "sk-from-secrets"
        }))
        monkeypatch.setattr(config, "SECRETS_PATH", secrets_path)
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")

        # Set environment variable
        monkeypatch.setenv("OPENROUTER_API_KEY", "sk-from-env")

        result = config.get_api_key("openrouter")
        assert result == "sk-from-env"

    def test_secrets_json_when_no_env(self, tmp_path, monkeypatch):
        """Test that secrets.json is used when no env var."""
        secrets_path = tmp_path / "secrets.json"
        secrets_path.write_text(json.dumps({
            "openrouter_api_key": "sk-from-secrets"
        }))
        monkeypatch.setattr(config, "SECRETS_PATH", secrets_path)
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")

        # Ensure no env var
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

        result = config.get_api_key("openrouter")
        assert result == "sk-from-secrets"

    def test_returns_none_for_placeholder(self, tmp_path, monkeypatch):
        """Test that placeholder values are treated as missing."""
        secrets_path = tmp_path / "secrets.json"
        secrets_path.write_text(json.dumps({
            "openrouter_api_key": "sk-or-v1-your-key-here"
        }))
        monkeypatch.setattr(config, "SECRETS_PATH", secrets_path)
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

        result = config.get_api_key("openrouter")
        assert result is None

    def test_returns_none_when_missing(self, tmp_path, monkeypatch):
        """Test that None is returned when key not configured."""
        monkeypatch.setattr(config, "SECRETS_PATH", tmp_path / "secrets.json")
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

        result = config.get_api_key("openrouter")
        assert result is None

    def test_tavily_key_lookup(self, tmp_path, monkeypatch):
        """Test Tavily API key lookup."""
        monkeypatch.setenv("TAVILY_API_KEY", "tvly-test-key")
        monkeypatch.setattr(config, "SECRETS_PATH", tmp_path / "secrets.json")
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")

        result = config.get_api_key("tavily")
        assert result == "tvly-test-key"

    def test_case_insensitive_service_name(self, tmp_path, monkeypatch):
        """Test that service names are case-insensitive."""
        monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
        monkeypatch.setattr(config, "SECRETS_PATH", tmp_path / "secrets.json")
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")

        assert config.get_api_key("OpenRouter") == "sk-test"
        assert config.get_api_key("OPENROUTER") == "sk-test"
        assert config.get_api_key("openrouter") == "sk-test"


class TestIsDryRun:
    """Test suite for is_dry_run() mode detection."""

    def test_dry_run_with_1(self, monkeypatch):
        """Test SHUTTER_DRY_RUN=1 enables dry run."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "1")
        assert config.is_dry_run() is True

    def test_dry_run_with_true(self, monkeypatch):
        """Test SHUTTER_DRY_RUN=true enables dry run."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "true")
        assert config.is_dry_run() is True

    def test_dry_run_with_yes(self, monkeypatch):
        """Test SHUTTER_DRY_RUN=yes enables dry run."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "yes")
        assert config.is_dry_run() is True

    def test_dry_run_case_insensitive(self, monkeypatch):
        """Test that dry run values are case-insensitive."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "TRUE")
        assert config.is_dry_run() is True

    def test_dry_run_disabled_by_default(self, monkeypatch):
        """Test that dry run is disabled when env var not set."""
        monkeypatch.delenv("SHUTTER_DRY_RUN", raising=False)
        assert config.is_dry_run() is False

    def test_dry_run_disabled_with_0(self, monkeypatch):
        """Test SHUTTER_DRY_RUN=0 disables dry run."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "0")
        assert config.is_dry_run() is False

    def test_dry_run_disabled_with_false(self, monkeypatch):
        """Test SHUTTER_DRY_RUN=false disables dry run."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "false")
        assert config.is_dry_run() is False


class TestEnsureConfigDir:
    """Test suite for ensure_config_dir()."""

    def test_creates_directory(self, tmp_path, monkeypatch):
        """Test that config directory is created."""
        config_dir = tmp_path / "test_shutter"
        monkeypatch.setattr(config, "CONFIG_DIR", config_dir)

        assert not config_dir.exists()
        config.ensure_config_dir()
        assert config_dir.exists()

    def test_idempotent(self, tmp_path, monkeypatch):
        """Test that ensure_config_dir can be called multiple times."""
        config_dir = tmp_path / "test_shutter"
        monkeypatch.setattr(config, "CONFIG_DIR", config_dir)

        config.ensure_config_dir()
        config.ensure_config_dir()  # Should not raise
        assert config_dir.exists()
