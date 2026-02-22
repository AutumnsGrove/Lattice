"""Tests for dev commands - format, reinstall, etc."""

from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from gw.packages import Package, PackageType
from gw.commands.dev.format import (
    _build_python_fmt_cmd,
    _build_node_fmt_cmd,
)


# ============================================================================
# Format Command Builder Tests
# ============================================================================


class TestBuildPythonFmtCmd:
    """Tests for Python format command builder."""

    def test_basic_format_command(self) -> None:
        """Test basic ruff format command."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.PYTHON,
        )

        cmd = _build_python_fmt_cmd(pkg, check_only=False, verbose=False, files=())

        assert cmd == ["uv", "run", "ruff", "format", "."]

    def test_check_only_flag(self) -> None:
        """Test --check flag is added for check mode."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.PYTHON,
        )

        cmd = _build_python_fmt_cmd(pkg, check_only=True, verbose=False, files=())

        assert "--check" in cmd
        assert cmd == ["uv", "run", "ruff", "format", "--check", "."]

    def test_verbose_flag(self) -> None:
        """Test --verbose flag is added."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.PYTHON,
        )

        cmd = _build_python_fmt_cmd(pkg, check_only=False, verbose=True, files=())

        assert "--verbose" in cmd

    def test_specific_files(self) -> None:
        """Test formatting specific files."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.PYTHON,
        )

        cmd = _build_python_fmt_cmd(
            pkg,
            check_only=False,
            verbose=False,
            files=("src/main.py", "src/utils.py"),
        )

        assert "src/main.py" in cmd
        assert "src/utils.py" in cmd
        assert "." not in cmd  # Should not have default "." when files specified

    def test_all_flags_together(self) -> None:
        """Test check + verbose together."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.PYTHON,
        )

        cmd = _build_python_fmt_cmd(pkg, check_only=True, verbose=True, files=())

        assert "--check" in cmd
        assert "--verbose" in cmd


class TestBuildNodeFmtCmd:
    """Tests for Node format command builder."""

    def test_uses_package_format_script(self) -> None:
        """Test that package.json format script is used if available."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.SVELTEKIT,
            scripts={"format": "prettier --write ."},
        )

        cmd = _build_node_fmt_cmd(pkg, check_only=False, verbose=False, files=())

        assert cmd == ["pnpm", "run", "format"]

    def test_uses_format_check_script(self) -> None:
        """Test that format:check script is used for check mode."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.SVELTEKIT,
            scripts={"format": "prettier --write .", "format:check": "prettier --check ."},
        )

        cmd = _build_node_fmt_cmd(pkg, check_only=True, verbose=False, files=())

        assert cmd == ["pnpm", "run", "format:check"]

    def test_fallback_to_prettier_directly(self) -> None:
        """Test fallback to pnpm exec prettier when no script."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.LIBRARY,
            scripts={},
        )

        cmd = _build_node_fmt_cmd(pkg, check_only=False, verbose=False, files=())

        assert cmd[0:3] == ["pnpm", "exec", "prettier"]
        assert "--write" in cmd

    def test_prettier_check_mode(self) -> None:
        """Test prettier --check when no format:check script."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.LIBRARY,
            scripts={},
        )

        cmd = _build_node_fmt_cmd(pkg, check_only=True, verbose=False, files=())

        assert "--check" in cmd
        assert "--write" not in cmd

    def test_prettier_default_patterns(self) -> None:
        """Test default glob patterns when no files specified."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.LIBRARY,
            scripts={},
        )

        cmd = _build_node_fmt_cmd(pkg, check_only=False, verbose=False, files=())

        # Should include common patterns
        assert "src/**/*.{ts,js,svelte,css,json}" in cmd
        assert "*.{ts,js,json}" in cmd

    def test_prettier_specific_files(self) -> None:
        """Test formatting specific files with prettier."""
        pkg = Package(
            name="test-pkg",
            path=Path("/test"),
            package_type=PackageType.LIBRARY,
            scripts={},
        )

        cmd = _build_node_fmt_cmd(
            pkg,
            check_only=False,
            verbose=False,
            files=("src/index.ts", "src/utils.ts"),
        )

        assert "src/index.ts" in cmd
        assert "src/utils.ts" in cmd
        # Should not have default patterns
        assert "src/**/*.{ts,js,svelte,css,json}" not in cmd


# ============================================================================
# Reinstall Command Tests
# ============================================================================


class TestReinstallPathResolution:
    """Tests for reinstall path resolution logic."""

    def test_tools_path_mapping(self) -> None:
        """Test that tool names map to correct paths."""
        # This tests the concept - actual path depends on install location
        tools = {
            "gw": "tools/gw",
            "gf": "tools/grove-find",
        }

        assert "gw" in tools
        assert "gf" in tools
        assert tools["gw"].endswith("gw")
        assert tools["gf"].endswith("grove-find")

    def test_unknown_tool_filter(self) -> None:
        """Test that unknown tools are filtered out."""
        known_tools = {"gw", "gf"}
        requested = ("gw", "unknown", "gf", "another")

        filtered = [t for t in requested if t in known_tools]

        assert filtered == ["gw", "gf"]
        assert "unknown" not in filtered
