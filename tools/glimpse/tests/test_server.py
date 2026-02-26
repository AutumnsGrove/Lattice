"""Tests for glimpse.server — ServerManager and health checks.

Uses mocks to avoid needing actual running servers.
"""

import os
from pathlib import Path
from unittest.mock import patch, MagicMock

from glimpse.config import GlimpseConfig
from glimpse.server.manager import ServerManager


class TestServerManagerInit:
    def test_finds_grove_root_from_env(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GROVE_ROOT", str(tmp_path))
        config = GlimpseConfig()
        mgr = ServerManager(config)
        assert mgr._grove_root == tmp_path

    def test_finds_grove_root_from_pnpm(self, tmp_path, monkeypatch):
        monkeypatch.delenv("GROVE_ROOT", raising=False)
        (tmp_path / "pnpm-workspace.yaml").touch()
        monkeypatch.chdir(tmp_path)
        config = GlimpseConfig()
        mgr = ServerManager(config)
        assert mgr._grove_root == tmp_path

    def test_no_grove_root_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.delenv("GROVE_ROOT", raising=False)
        monkeypatch.chdir(tmp_path)
        config = GlimpseConfig()
        mgr = ServerManager(config)
        assert mgr._grove_root is None


class TestServerManagerStatus:
    def test_no_pid_file(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GROVE_ROOT", str(tmp_path))
        config = GlimpseConfig()
        mgr = ServerManager(config)
        status = mgr.get_status()
        assert status["managed"] is False
        assert status["running"] is False
        assert status["pid"] is None

    def test_stale_pid_file(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GROVE_ROOT", str(tmp_path))
        pid_dir = tmp_path / ".glimpse"
        pid_dir.mkdir()
        (pid_dir / "server.pid").write_text("999999")

        config = GlimpseConfig()
        mgr = ServerManager(config)
        status = mgr.get_status()
        # PID 999999 almost certainly doesn't exist
        assert status["managed"] is True
        assert status["running"] is False

    def test_valid_pid_file(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GROVE_ROOT", str(tmp_path))
        pid_dir = tmp_path / ".glimpse"
        pid_dir.mkdir()
        # Use our own PID — we know it exists
        (pid_dir / "server.pid").write_text(str(os.getpid()))

        config = GlimpseConfig()
        mgr = ServerManager(config)
        status = mgr.get_status()
        assert status["managed"] is True
        assert status["running"] is True
        assert status["pid"] == os.getpid()


class TestServerManagerStop:
    def test_stop_no_pid_file(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GROVE_ROOT", str(tmp_path))
        config = GlimpseConfig()
        mgr = ServerManager(config)
        ok, err = mgr.stop_server()
        assert ok is False
        assert "No Glimpse-managed server" in err

    def test_stop_invalid_pid_file(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GROVE_ROOT", str(tmp_path))
        pid_dir = tmp_path / ".glimpse"
        pid_dir.mkdir()
        (pid_dir / "server.pid").write_text("not-a-number")

        config = GlimpseConfig()
        mgr = ServerManager(config)
        ok, err = mgr.stop_server()
        assert ok is False
        assert "Invalid PID file" in err
        # PID file should be cleaned up
        assert not (pid_dir / "server.pid").exists()


class TestServerManagerEnsure:
    def test_already_reachable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GROVE_ROOT", str(tmp_path))
        config = GlimpseConfig()
        mgr = ServerManager(config)

        with patch("glimpse.server.manager.check_server_reachable", return_value=True):
            ok, err = mgr.ensure_server("http://localhost:5173")
            assert ok is True
            assert err == ""

    def test_not_reachable_no_grove_root(self, tmp_path, monkeypatch):
        monkeypatch.delenv("GROVE_ROOT", raising=False)
        monkeypatch.chdir(tmp_path)
        config = GlimpseConfig()
        mgr = ServerManager(config)

        with patch("glimpse.server.manager.check_server_reachable", return_value=False):
            ok, err = mgr.ensure_server("http://localhost:5173")
            assert ok is False
            assert "GROVE_ROOT not found" in err
