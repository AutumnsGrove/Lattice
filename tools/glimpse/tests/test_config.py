"""Tests for glimpse.config — configuration loading and defaults."""

import os
from pathlib import Path

from glimpse.config import GlimpseConfig


class TestGlimpseConfigDefaults:
    def test_default_viewport(self):
        config = GlimpseConfig()
        assert config.viewport_width == 1920
        assert config.viewport_height == 1080

    def test_default_scale(self):
        assert GlimpseConfig().scale == 2

    def test_default_wait(self):
        assert GlimpseConfig().wait_ms == 500

    def test_default_format(self):
        assert GlimpseConfig().format == "png"

    def test_default_quality(self):
        assert GlimpseConfig().quality == 90

    def test_default_output_dir(self):
        assert GlimpseConfig().output_dir == "screenshots"

    def test_default_timeout(self):
        assert GlimpseConfig().timeout_ms == 30000

    def test_no_default_season_or_theme(self):
        config = GlimpseConfig()
        assert config.season is None
        assert config.theme is None


class TestGlimpseConfigLoad:
    def test_load_returns_defaults_when_no_file(self, tmp_path, monkeypatch):
        """Load with no config file anywhere should return pure defaults."""
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)
        config = GlimpseConfig.load()
        assert config.viewport_width == 1920
        assert config.scale == 2

    def test_load_from_cwd(self, tmp_path, monkeypatch):
        """Config file in CWD should be picked up."""
        config_content = b"""
[defaults]
viewport_width = 1440
viewport_height = 900
scale = 1

[theme]
season = "winter"
"""
        config_file = tmp_path / ".glimpse.toml"
        config_file.write_bytes(config_content)
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)

        config = GlimpseConfig.load()
        assert config.viewport_width == 1440
        assert config.viewport_height == 900
        assert config.scale == 1
        assert config.season == "winter"

    def test_load_from_grove_root(self, tmp_path, monkeypatch):
        """Config at GROVE_ROOT should be found."""
        config_content = b"""
[defaults]
format = "jpeg"
quality = 85
"""
        grove_root = tmp_path / "grove"
        grove_root.mkdir()
        (grove_root / ".glimpse.toml").write_bytes(config_content)

        somewhere_else = tmp_path / "somewhere_else"
        somewhere_else.mkdir()
        monkeypatch.chdir(somewhere_else)
        monkeypatch.setenv("GROVE_ROOT", str(grove_root))

        config = GlimpseConfig.load()
        assert config.format == "jpeg"
        assert config.quality == 85

    def test_env_override_output_dir(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)
        monkeypatch.setenv("GLIMPSE_OUTPUT_DIR", "/custom/output")

        config = GlimpseConfig.load()
        assert config.output_dir == "/custom/output"

    def test_env_override_agent_mode(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)
        monkeypatch.setenv("GLIMPSE_AGENT", "1")

        config = GlimpseConfig.load()
        assert config.agent_mode is True

    def test_malformed_toml_falls_back(self, tmp_path, monkeypatch):
        """Malformed TOML should warn and return defaults, not crash."""
        (tmp_path / ".glimpse.toml").write_text("this is not valid { toml }")
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)

        config = GlimpseConfig.load()
        # Should fall back to defaults
        assert config.viewport_width == 1920

    def test_load_server_section(self, tmp_path, monkeypatch):
        """[server] section should populate server config."""
        config_content = b"""
[server]
port = 3000
start_command = "npm run dev"
start_cwd = "apps/web"
health_timeout = 60000
pid_file = ".glimpse/custom.pid"
"""
        (tmp_path / ".glimpse.toml").write_bytes(config_content)
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)

        config = GlimpseConfig.load()
        assert config.server_port == 3000
        assert config.server_start_command == "npm run dev"
        assert config.server_start_cwd == "apps/web"
        assert config.server_health_timeout == 60000
        assert config.server_pid_file == ".glimpse/custom.pid"

    def test_load_seed_section(self, tmp_path, monkeypatch):
        """[seed] section should populate seed config."""
        config_content = b"""
[seed]
scripts_dir = "db/seeds"
default_tenant = "test-grove"
migrations_dir = "apps/web/migrations"
"""
        (tmp_path / ".glimpse.toml").write_bytes(config_content)
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)

        config = GlimpseConfig.load()
        assert config.seed_scripts_dir == "db/seeds"
        assert config.seed_default_tenant == "test-grove"
        assert config.seed_migrations_dir == "apps/web/migrations"

    def test_load_logs_default(self, tmp_path, monkeypatch):
        """[defaults] logs should be loaded from config."""
        config_content = b"""
[defaults]
logs = true
"""
        (tmp_path / ".glimpse.toml").write_bytes(config_content)
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)

        config = GlimpseConfig.load()
        assert config.logs is True

    def test_load_lumen_section(self, tmp_path, monkeypatch):
        """[lumen] section should populate gateway config."""
        config_content = b"""
[lumen]
gateway_url = "https://custom-lumen.example.com/api"
model = "gpt-4o"
"""
        (tmp_path / ".glimpse.toml").write_bytes(config_content)
        monkeypatch.chdir(tmp_path)
        monkeypatch.delenv("GROVE_ROOT", raising=False)

        config = GlimpseConfig.load()
        assert config.lumen_gateway_url == "https://custom-lumen.example.com/api"
        assert config.lumen_model == "gpt-4o"


class TestGlimpseConfigServerDefaults:
    def test_server_defaults(self):
        config = GlimpseConfig()
        assert config.server_port == 5173
        assert config.server_start_command == "pnpm dev:wrangler"
        assert config.server_start_cwd == "libs/engine"
        assert config.server_health_timeout == 30000
        assert config.server_pid_file == ".glimpse/server.pid"

    def test_seed_defaults(self):
        config = GlimpseConfig()
        assert config.seed_scripts_dir == "scripts/db"
        assert config.seed_default_tenant == "midnight-bloom"
        assert config.seed_migrations_dir == "libs/engine/migrations"

    def test_logs_default(self):
        config = GlimpseConfig()
        assert config.logs is False

    def test_lumen_defaults(self):
        config = GlimpseConfig()
        assert config.lumen_gateway_url is None
        assert config.lumen_model == "gemini-flash"

    def test_browser_defaults(self):
        config = GlimpseConfig()
        assert config.headless is True
        assert config.browser == "chromium"
