"""Configuration management for grove-find.

Handles GROVE_ROOT detection, output mode settings, and configuration precedence.
"""

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional
import os


class OutputMode(Enum):
    """Output formatting mode."""

    HUMAN = "human"  # Rich formatting with colors and emoji
    AGENT = "agent"  # Clean output: no colors, no emoji, no box-drawing
    JSON = "json"  # Structured JSON output


@dataclass
class Config:
    """Runtime configuration for grove-find.

    Configuration precedence (highest to lowest):
    1. CLI flags (--root, --agent, --json)
    2. Environment variables (GROVE_ROOT, GF_AGENT)
    3. Auto-detection (walk up from CWD)
    """

    grove_root: Path
    output_mode: OutputMode
    verbose: bool = False

    @classmethod
    def from_env_and_cwd(
        cls,
        root_override: Optional[str] = None,
        agent_mode: bool = False,
        json_mode: bool = False,
        verbose: bool = False,
    ) -> "Config":
        """Create config from environment and current working directory.

        Args:
            root_override: Explicit root path (highest precedence)
            agent_mode: Force agent mode output
            json_mode: Force JSON output
            verbose: Enable verbose logging

        Returns:
            Configured Config instance

        Raises:
            ValueError: If no valid Grove root can be found
        """
        # Determine grove root
        if root_override:
            grove_root = Path(root_override).resolve()
        elif os.environ.get("GROVE_ROOT"):
            grove_root = Path(os.environ["GROVE_ROOT"]).resolve()
        else:
            grove_root = cls._detect_grove_root()

        # Determine output mode
        if json_mode:
            output_mode = OutputMode.JSON
        elif agent_mode or os.environ.get("GF_AGENT"):
            output_mode = OutputMode.AGENT
        else:
            output_mode = OutputMode.HUMAN

        return cls(
            grove_root=grove_root,
            output_mode=output_mode,
            verbose=verbose,
        )

    @staticmethod
    def _detect_grove_root() -> Path:
        """Walk up from CWD to find Grove project root.

        Looks for (in order):
        1. AGENT.md file (Grove project marker)
        2. .git directory (fallback)

        Returns:
            Path to detected Grove root

        Raises:
            ValueError: If no valid root found
        """
        current = Path.cwd().resolve()

        while current != current.parent:
            # Primary marker: AGENT.md
            if (current / "AGENT.md").exists():
                return current

            # Fallback marker: .git
            if (current / ".git").exists():
                return current

            current = current.parent

        raise ValueError(
            "Could not detect Grove root. "
            "Run from within a Grove project, or set GROVE_ROOT environment variable."
        )

    @property
    def is_agent_mode(self) -> bool:
        """Check if running in agent mode."""
        return self.output_mode == OutputMode.AGENT

    @property
    def is_json_mode(self) -> bool:
        """Check if running in JSON mode."""
        return self.output_mode == OutputMode.JSON

    @property
    def is_human_mode(self) -> bool:
        """Check if running in human-friendly mode."""
        return self.output_mode == OutputMode.HUMAN


# Global config singleton (set by CLI)
_config: Optional[Config] = None


def get_config() -> Config:
    """Get the current configuration.

    Returns:
        Current Config instance

    Raises:
        RuntimeError: If config not initialized
    """
    if _config is None:
        raise RuntimeError("Config not initialized. Call set_config() first.")
    return _config


def set_config(config: Config) -> None:
    """Set the global configuration.

    Args:
        config: Config instance to use globally
    """
    global _config
    _config = config
