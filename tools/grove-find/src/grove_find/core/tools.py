"""External tool discovery for grove-find.

Locates ripgrep (rg), fd, git, and gh binaries, providing graceful
error messages when tools are missing.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import shutil
import subprocess


@dataclass
class ToolPaths:
    """Discovered paths to external tools."""

    rg: Optional[Path] = None  # ripgrep (required)
    fd: Optional[Path] = None  # fd-find (optional — needed for file-type searches)
    git: Optional[Path] = None  # git (required)
    gh: Optional[Path] = None  # GitHub CLI (optional — needed for GitHub commands)

    @property
    def has_required_tools(self) -> bool:
        """Check if minimum required tools (rg + git) are available."""
        return all([self.rg, self.git])

    @property
    def has_fd(self) -> bool:
        """Check if fd-find is available (needed for file-type searches)."""
        return self.fd is not None

    @property
    def has_gh(self) -> bool:
        """Check if GitHub CLI is available."""
        return self.gh is not None

    def get_missing_required(self) -> list[str]:
        """Get list of missing required tools."""
        missing = []
        if not self.rg:
            missing.append("ripgrep (rg)")
        if not self.git:
            missing.append("git")
        return missing

    def get_missing_optional(self) -> list[str]:
        """Get list of missing optional tools."""
        missing = []
        if not self.fd:
            missing.append("fd (file-type searches: gf svelte, gf ts, gf test, etc.)")
        if not self.gh:
            missing.append("gh (GitHub commands: gf github issue, gf github board, etc.)")
        return missing


# Common search paths for binaries
SEARCH_PATHS = [
    "/opt/homebrew/bin",  # Apple Silicon Homebrew
    "/usr/local/bin",  # Intel Mac Homebrew / Linux
    str(Path.home() / ".local/bin"),  # User-local installs
    str(Path.home() / "bin"),  # User bin
    str(Path.home() / ".cargo/bin"),  # Rust/cargo installs
    "/usr/bin",  # System binaries
]


def _find_binary(name: str, alt_names: Optional[list[str]] = None) -> Optional[Path]:
    """Find a binary by name, checking common locations.

    Args:
        name: Primary binary name to search for
        alt_names: Alternative names to try (e.g., 'fdfind' for 'fd' on Ubuntu)

    Returns:
        Path to binary if found, None otherwise
    """
    names_to_try = [name] + (alt_names or [])

    for binary_name in names_to_try:
        # First try shutil.which (respects PATH)
        found = shutil.which(binary_name)
        if found:
            return Path(found)

        # Then search known locations
        for search_path in SEARCH_PATHS:
            candidate = Path(search_path) / binary_name
            if candidate.is_file() and candidate.stat().st_mode & 0o111:
                return candidate

    return None


def discover_tools() -> ToolPaths:
    """Discover all external tools.

    Returns:
        ToolPaths with discovered tool locations
    """
    return ToolPaths(
        rg=_find_binary("rg"),
        fd=_find_binary("fd", alt_names=["fdfind"]),  # Ubuntu uses fdfind
        git=_find_binary("git"),
        gh=_find_binary("gh"),
    )


def get_install_instructions() -> str:
    """Get installation instructions for missing tools.

    Returns:
        Multi-line string with installation commands
    """
    return """Required tools installation:

  macOS (Homebrew):
    brew install ripgrep fd

  Ubuntu/Debian:
    sudo apt install ripgrep fd-find
    # Note: On Ubuntu, fd is installed as 'fdfind'

  Arch Linux:
    sudo pacman -S ripgrep fd

  Windows (Scoop):
    scoop install ripgrep fd

Optional (for GitHub features):
  brew install gh
  # Then: gh auth login
"""


def run_tool(
    tool_path: Path,
    args: list[str],
    cwd: Optional[Path] = None,
    capture_output: bool = True,
    check: bool = False,
) -> subprocess.CompletedProcess:
    """Run an external tool with arguments.

    Args:
        tool_path: Path to the tool binary
        args: Command-line arguments
        cwd: Working directory (defaults to current)
        capture_output: Whether to capture stdout/stderr
        check: Whether to raise on non-zero exit

    Returns:
        CompletedProcess with results
    """
    return subprocess.run(
        [str(tool_path)] + args,
        cwd=cwd,
        capture_output=capture_output,
        text=True,
        check=check,
    )
