"""Monorepo package detection and management.

Detects packages in the GroveEngine monorepo and provides utilities for
running commands in the appropriate package context.
"""

import json
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


class PackageType(Enum):
    """Type of package in the monorepo."""

    SVELTEKIT = "sveltekit"  # SvelteKit app (packages with svelte.config.js)
    WORKER = "worker"  # Cloudflare Worker (has wrangler.toml, no svelte)
    LIBRARY = "library"  # TypeScript library (package.json, no svelte/wrangler)
    ZIG = "zig"  # Zig WASM package (has build.zig)
    PYTHON = "python"  # Python package (has pyproject.toml)
    UNKNOWN = "unknown"


@dataclass
class Package:
    """Represents a package in the monorepo."""

    name: str
    path: Path
    package_type: PackageType
    scripts: dict[str, str] = field(default_factory=dict)
    dependencies: list[str] = field(default_factory=list)
    dev_dependencies: list[str] = field(default_factory=list)

    @property
    def has_script(self) -> dict[str, bool]:
        """Check which standard scripts are available."""
        return {
            "dev": "dev" in self.scripts,
            "build": "build" in self.scripts,
            "test": "test" in self.scripts or "test:run" in self.scripts,
            "check": "check" in self.scripts,
            "lint": "lint" in self.scripts,
            "deploy": "deploy" in self.scripts,
        }

    @property
    def test_command(self) -> Optional[str]:
        """Get the appropriate test command."""
        if "test:run" in self.scripts:
            return "test:run"
        if "test" in self.scripts:
            return "test"
        return None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "name": self.name,
            "path": str(self.path),
            "type": self.package_type.value,
            "scripts": self.scripts,
            "has": self.has_script,
        }


@dataclass
class Monorepo:
    """Represents the entire monorepo structure."""

    root: Path
    packages: list[Package] = field(default_factory=list)
    package_manager: str = "pnpm"

    def find_package(self, name: str) -> Optional[Package]:
        """Find a package by name."""
        for pkg in self.packages:
            if pkg.name == name:
                return pkg
        return None

    def find_package_at_path(self, path: Path) -> Optional[Package]:
        """Find a package containing the given path."""
        path = path.resolve()
        for pkg in self.packages:
            pkg_path = pkg.path.resolve()
            try:
                path.relative_to(pkg_path)
                return pkg
            except ValueError:
                continue
        return None

    def packages_by_type(self, package_type: PackageType) -> list[Package]:
        """Get all packages of a specific type."""
        return [p for p in self.packages if p.package_type == package_type]

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "root": str(self.root),
            "package_manager": self.package_manager,
            "packages": [p.to_dict() for p in self.packages],
        }


def find_monorepo_root(start_path: Optional[Path] = None) -> Optional[Path]:
    """Find the monorepo root by looking for pnpm-workspace.yaml.

    Args:
        start_path: Path to start searching from (default: cwd)

    Returns:
        Path to monorepo root, or None if not found
    """
    current = (start_path or Path.cwd()).resolve()

    while current != current.parent:
        if (current / "pnpm-workspace.yaml").exists():
            return current
        if (current / "package.json").exists():
            # Check if it's a workspace root
            try:
                with open(current / "package.json") as f:
                    data = json.load(f)
                    if "workspaces" in data:
                        return current
            except (json.JSONDecodeError, IOError):
                pass
        current = current.parent

    return None


def detect_package_type(package_path: Path) -> PackageType:
    """Detect the type of package at the given path.

    Args:
        package_path: Path to the package directory

    Returns:
        PackageType enum value
    """
    # Check for Zig first (has both build.zig and package.json)
    if (package_path / "build.zig").exists():
        return PackageType.ZIG

    # Check for Python
    if (package_path / "pyproject.toml").exists():
        return PackageType.PYTHON

    # Check for TypeScript/JavaScript packages
    if (package_path / "package.json").exists():
        # SvelteKit has svelte.config.js
        if (package_path / "svelte.config.js").exists():
            return PackageType.SVELTEKIT

        # Workers have wrangler.toml but no svelte
        if (package_path / "wrangler.toml").exists():
            return PackageType.WORKER

        # Otherwise it's a library
        return PackageType.LIBRARY

    return PackageType.UNKNOWN


def load_package(package_path: Path) -> Optional[Package]:
    """Load package information from a directory.

    Args:
        package_path: Path to the package directory

    Returns:
        Package object, or None if not a valid package
    """
    package_type = detect_package_type(package_path)

    if package_type == PackageType.UNKNOWN:
        return None

    if package_type == PackageType.PYTHON:
        return _load_python_package(package_path)

    return _load_node_package(package_path, package_type)


def _load_node_package(package_path: Path, package_type: PackageType) -> Optional[Package]:
    """Load a Node.js package."""
    package_json = package_path / "package.json"
    if not package_json.exists():
        return None

    try:
        with open(package_json) as f:
            data = json.load(f)
    except (json.JSONDecodeError, IOError):
        return None

    return Package(
        name=data.get("name", package_path.name),
        path=package_path,
        package_type=package_type,
        scripts=data.get("scripts", {}),
        dependencies=list(data.get("dependencies", {}).keys()),
        dev_dependencies=list(data.get("devDependencies", {}).keys()),
    )


def _load_python_package(package_path: Path) -> Optional[Package]:
    """Load a Python package from pyproject.toml."""
    pyproject = package_path / "pyproject.toml"
    if not pyproject.exists():
        return None

    try:
        import tomli

        with open(pyproject, "rb") as f:
            data = tomli.load(f)
    except (ImportError, IOError):
        return None

    project = data.get("project", {})
    scripts = project.get("scripts", {})

    # Map Python scripts to standard names
    script_map = {}
    for name in scripts:
        script_map[name] = f"uv run {name}"

    # Add standard Python commands
    script_map["test"] = "uv run pytest"
    script_map["lint"] = "uv run ruff check"
    script_map["check"] = "uv run mypy"

    return Package(
        name=project.get("name", package_path.name),
        path=package_path,
        package_type=PackageType.PYTHON,
        scripts=script_map,
        dependencies=project.get("dependencies", []),
    )


def discover_packages(root: Path) -> list[Package]:
    """Discover all packages in the monorepo.

    Args:
        root: Path to monorepo root

    Returns:
        List of Package objects
    """
    packages = []

    # Check packages/ directory
    packages_dir = root / "packages"
    if packages_dir.exists():
        for child in packages_dir.iterdir():
            if child.is_dir():
                pkg = load_package(child)
                if pkg:
                    packages.append(pkg)

                # Check for nested packages (e.g., packages/workers/*)
                for subchild in child.iterdir():
                    if subchild.is_dir():
                        subpkg = load_package(subchild)
                        if subpkg:
                            packages.append(subpkg)

    # Check tools/ directory for Python packages
    tools_dir = root / "tools"
    if tools_dir.exists():
        for child in tools_dir.iterdir():
            if child.is_dir():
                pkg = load_package(child)
                if pkg:
                    packages.append(pkg)

    return packages


def load_monorepo(start_path: Optional[Path] = None) -> Optional[Monorepo]:
    """Load the complete monorepo structure.

    Args:
        start_path: Path to start searching from (default: cwd)

    Returns:
        Monorepo object, or None if not in a monorepo
    """
    root = find_monorepo_root(start_path)
    if not root:
        return None

    packages = discover_packages(root)

    # Detect package manager
    package_manager = "pnpm"
    if (root / "pnpm-lock.yaml").exists():
        package_manager = "pnpm"
    elif (root / "yarn.lock").exists():
        package_manager = "yarn"
    elif (root / "package-lock.json").exists():
        package_manager = "npm"

    return Monorepo(
        root=root,
        packages=packages,
        package_manager=package_manager,
    )


def detect_current_package(path: Optional[Path] = None) -> Optional[Package]:
    """Detect which package the current directory is in.

    Args:
        path: Path to check (default: cwd)

    Returns:
        Package object if in a package, None otherwise
    """
    current = (path or Path.cwd()).resolve()

    # First, try to find a package directly at this path
    pkg = load_package(current)
    if pkg:
        return pkg

    # Walk up looking for a package
    while current != current.parent:
        pkg = load_package(current)
        if pkg:
            return pkg
        current = current.parent

    return None


def run_package_script(
    package: Package,
    script: str,
    extra_args: Optional[list[str]] = None,
    capture_output: bool = False,
) -> subprocess.CompletedProcess:
    """Run a script in a package.

    Args:
        package: Package to run script in
        script: Script name to run
        extra_args: Additional arguments to pass
        capture_output: Whether to capture stdout/stderr

    Returns:
        CompletedProcess result
    """
    if package.package_type == PackageType.PYTHON:
        # Python packages use uv run
        if script in package.scripts:
            cmd = package.scripts[script].split()
        else:
            cmd = ["uv", "run", script]
    else:
        # Node packages use pnpm
        cmd = ["pnpm", "run", script]

    if extra_args:
        cmd.extend(extra_args)

    return subprocess.run(
        cmd,
        cwd=package.path,
        capture_output=capture_output,
        text=True,
    )
