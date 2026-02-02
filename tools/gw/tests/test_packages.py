"""Tests for package detection and monorepo awareness."""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from gw.packages import (
    Package,
    PackageType,
    Monorepo,
    find_monorepo_root,
    detect_package_type,
    load_package,
    discover_packages,
    load_monorepo,
    detect_current_package,
)


# ============================================================================
# Package Type Detection Tests
# ============================================================================


class TestPackageTypeDetection:
    """Tests for package type detection."""

    def test_sveltekit_detection(self, tmp_path: Path) -> None:
        """Test SvelteKit package detection."""
        (tmp_path / "package.json").write_text('{"name": "test"}')
        (tmp_path / "svelte.config.js").write_text("export default {}")

        assert detect_package_type(tmp_path) == PackageType.SVELTEKIT

    def test_worker_detection(self, tmp_path: Path) -> None:
        """Test Cloudflare Worker detection."""
        (tmp_path / "package.json").write_text('{"name": "test"}')
        (tmp_path / "wrangler.toml").write_text("[vars]")

        assert detect_package_type(tmp_path) == PackageType.WORKER

    def test_library_detection(self, tmp_path: Path) -> None:
        """Test library package detection."""
        (tmp_path / "package.json").write_text('{"name": "test"}')

        assert detect_package_type(tmp_path) == PackageType.LIBRARY

    def test_zig_detection(self, tmp_path: Path) -> None:
        """Test Zig package detection."""
        (tmp_path / "build.zig").write_text("// zig build")
        (tmp_path / "package.json").write_text('{"name": "test"}')

        # Zig takes precedence over Node
        assert detect_package_type(tmp_path) == PackageType.ZIG

    def test_python_detection(self, tmp_path: Path) -> None:
        """Test Python package detection."""
        (tmp_path / "pyproject.toml").write_text('[project]\nname = "test"')

        assert detect_package_type(tmp_path) == PackageType.PYTHON

    def test_unknown_detection(self, tmp_path: Path) -> None:
        """Test unknown package type."""
        # Empty directory
        assert detect_package_type(tmp_path) == PackageType.UNKNOWN


# ============================================================================
# Package Loading Tests
# ============================================================================


class TestPackageLoading:
    """Tests for loading package information."""

    def test_load_node_package(self, tmp_path: Path) -> None:
        """Test loading a Node.js package."""
        package_json = {
            "name": "@test/package",
            "scripts": {
                "dev": "vite dev",
                "build": "vite build",
                "test": "vitest",
            },
            "dependencies": {"svelte": "^5.0.0"},
            "devDependencies": {"vitest": "^1.0.0"},
        }
        (tmp_path / "package.json").write_text(json.dumps(package_json))
        (tmp_path / "svelte.config.js").write_text("")

        pkg = load_package(tmp_path)

        assert pkg is not None
        assert pkg.name == "@test/package"
        assert pkg.package_type == PackageType.SVELTEKIT
        assert "dev" in pkg.scripts
        assert "build" in pkg.scripts
        assert "test" in pkg.scripts
        assert pkg.has_script["dev"] is True
        assert pkg.has_script["test"] is True

    def test_load_package_invalid_json(self, tmp_path: Path) -> None:
        """Test loading package with invalid JSON."""
        (tmp_path / "package.json").write_text("not json")

        pkg = load_package(tmp_path)
        assert pkg is None

    def test_load_package_no_package_json(self, tmp_path: Path) -> None:
        """Test loading from directory without package.json."""
        pkg = load_package(tmp_path)
        assert pkg is None


# ============================================================================
# Monorepo Detection Tests
# ============================================================================


class TestMonorepoDetection:
    """Tests for monorepo root detection."""

    def test_find_root_with_pnpm_workspace(self, tmp_path: Path) -> None:
        """Test finding root via pnpm-workspace.yaml."""
        (tmp_path / "pnpm-workspace.yaml").write_text("packages:\n  - packages/*")
        (tmp_path / "packages").mkdir()
        subdir = tmp_path / "packages" / "app"
        subdir.mkdir()

        root = find_monorepo_root(subdir)
        assert root == tmp_path

    def test_find_root_with_workspaces_in_package_json(self, tmp_path: Path) -> None:
        """Test finding root via workspaces in package.json."""
        (tmp_path / "package.json").write_text('{"workspaces": ["packages/*"]}')
        subdir = tmp_path / "nested" / "deep"
        subdir.mkdir(parents=True)

        root = find_monorepo_root(subdir)
        assert root == tmp_path

    def test_find_root_not_found(self, tmp_path: Path) -> None:
        """Test when no monorepo root is found."""
        root = find_monorepo_root(tmp_path)
        assert root is None


# ============================================================================
# Package Discovery Tests
# ============================================================================


class TestPackageDiscovery:
    """Tests for discovering packages in monorepo."""

    def test_discover_packages_in_packages_dir(self, tmp_path: Path) -> None:
        """Test discovering packages in packages/ directory."""
        # Create monorepo structure
        (tmp_path / "pnpm-workspace.yaml").write_text("packages:\n  - packages/*")
        packages_dir = tmp_path / "packages"
        packages_dir.mkdir()

        # Create two packages
        app1 = packages_dir / "app1"
        app1.mkdir()
        (app1 / "package.json").write_text('{"name": "app1", "scripts": {"dev": "vite"}}')
        (app1 / "svelte.config.js").write_text("")

        app2 = packages_dir / "app2"
        app2.mkdir()
        (app2 / "package.json").write_text('{"name": "app2", "scripts": {"dev": "vite"}}')

        packages = discover_packages(tmp_path)

        assert len(packages) == 2
        names = {p.name for p in packages}
        assert "app1" in names
        assert "app2" in names

    def test_discover_nested_packages(self, tmp_path: Path) -> None:
        """Test discovering nested packages (e.g., packages/workers/*)."""
        (tmp_path / "pnpm-workspace.yaml").write_text("")
        packages_dir = tmp_path / "packages"
        packages_dir.mkdir()

        workers_dir = packages_dir / "workers"
        workers_dir.mkdir()

        worker1 = workers_dir / "worker1"
        worker1.mkdir()
        (worker1 / "package.json").write_text('{"name": "worker1"}')
        (worker1 / "wrangler.toml").write_text("")

        packages = discover_packages(tmp_path)

        assert len(packages) == 1
        assert packages[0].name == "worker1"
        assert packages[0].package_type == PackageType.WORKER

    def test_discover_tools_directory(self, tmp_path: Path) -> None:
        """Test discovering Python packages in tools/ directory."""
        (tmp_path / "pnpm-workspace.yaml").write_text("")
        tools_dir = tmp_path / "tools"
        tools_dir.mkdir()

        tool = tools_dir / "my-tool"
        tool.mkdir()
        (tool / "pyproject.toml").write_text('[project]\nname = "my-tool"')

        packages = discover_packages(tmp_path)

        assert len(packages) == 1
        assert packages[0].name == "my-tool"
        assert packages[0].package_type == PackageType.PYTHON


# ============================================================================
# Package Object Tests
# ============================================================================


class TestPackageObject:
    """Tests for Package dataclass."""

    def test_has_script_detection(self) -> None:
        """Test script availability detection."""
        pkg = Package(
            name="test",
            path=Path("/test"),
            package_type=PackageType.SVELTEKIT,
            scripts={
                "dev": "vite dev",
                "build": "vite build",
                "test:run": "vitest run",
                "check": "svelte-check",
            },
        )

        assert pkg.has_script["dev"] is True
        assert pkg.has_script["build"] is True
        assert pkg.has_script["test"] is True  # test:run counts
        assert pkg.has_script["check"] is True
        assert pkg.has_script["lint"] is False
        assert pkg.has_script["deploy"] is False

    def test_test_command_prefers_test_run(self) -> None:
        """Test that test:run is preferred over test."""
        pkg = Package(
            name="test",
            path=Path("/test"),
            package_type=PackageType.SVELTEKIT,
            scripts={"test": "vitest", "test:run": "vitest run"},
        )

        assert pkg.test_command == "test:run"

    def test_test_command_falls_back_to_test(self) -> None:
        """Test fallback to test script."""
        pkg = Package(
            name="test",
            path=Path("/test"),
            package_type=PackageType.SVELTEKIT,
            scripts={"test": "vitest"},
        )

        assert pkg.test_command == "test"

    def test_to_dict(self) -> None:
        """Test JSON serialization."""
        pkg = Package(
            name="test",
            path=Path("/test"),
            package_type=PackageType.SVELTEKIT,
            scripts={"dev": "vite"},
        )

        data = pkg.to_dict()

        assert data["name"] == "test"
        assert data["path"] == "/test"
        assert data["type"] == "sveltekit"
        assert "scripts" in data
        assert "has" in data


# ============================================================================
# Monorepo Object Tests
# ============================================================================


class TestMonorepoObject:
    """Tests for Monorepo dataclass."""

    def test_find_package_by_name(self) -> None:
        """Test finding package by name."""
        pkg1 = Package(name="app1", path=Path("/app1"), package_type=PackageType.SVELTEKIT)
        pkg2 = Package(name="app2", path=Path("/app2"), package_type=PackageType.LIBRARY)

        monorepo = Monorepo(root=Path("/"), packages=[pkg1, pkg2])

        found = monorepo.find_package("app2")
        assert found is not None
        assert found.name == "app2"

        not_found = monorepo.find_package("app3")
        assert not_found is None

    def test_packages_by_type(self) -> None:
        """Test filtering packages by type."""
        pkg1 = Package(name="app1", path=Path("/app1"), package_type=PackageType.SVELTEKIT)
        pkg2 = Package(name="app2", path=Path("/app2"), package_type=PackageType.SVELTEKIT)
        pkg3 = Package(name="tool", path=Path("/tool"), package_type=PackageType.PYTHON)

        monorepo = Monorepo(root=Path("/"), packages=[pkg1, pkg2, pkg3])

        sveltekit_pkgs = monorepo.packages_by_type(PackageType.SVELTEKIT)
        assert len(sveltekit_pkgs) == 2

        python_pkgs = monorepo.packages_by_type(PackageType.PYTHON)
        assert len(python_pkgs) == 1


# ============================================================================
# Current Package Detection Tests
# ============================================================================


class TestCurrentPackageDetection:
    """Tests for detecting current package from cwd."""

    def test_detect_from_package_root(self, tmp_path: Path) -> None:
        """Test detection when in package root."""
        (tmp_path / "package.json").write_text('{"name": "test-pkg"}')
        (tmp_path / "svelte.config.js").write_text("")

        with patch("gw.packages.Path.cwd", return_value=tmp_path):
            pkg = detect_current_package(tmp_path)

        assert pkg is not None
        assert pkg.name == "test-pkg"

    def test_detect_from_subdirectory(self, tmp_path: Path) -> None:
        """Test detection when in a subdirectory of package."""
        (tmp_path / "package.json").write_text('{"name": "test-pkg"}')
        subdir = tmp_path / "src" / "components"
        subdir.mkdir(parents=True)

        pkg = detect_current_package(subdir)

        assert pkg is not None
        assert pkg.name == "test-pkg"
