"""Pytest configuration and fixtures for grove-find tests."""

import os
import pytest
from pathlib import Path
from typing import Generator
from unittest.mock import patch

from grove_find.core.config import Config, OutputMode, set_config


@pytest.fixture
def grove_root(tmp_path: Path) -> Path:
    """Create a temporary Grove project root."""
    # Create AGENT.md marker
    (tmp_path / "AGENT.md").write_text("# Test Project")
    (tmp_path / ".git").mkdir()

    # Create some test files
    src = tmp_path / "src"
    src.mkdir()
    (src / "app.ts").write_text("export function main() { console.log('hello'); }")
    (src / "App.svelte").write_text("<script>let count = 0;</script>")

    return tmp_path


@pytest.fixture
def config(grove_root: Path) -> Generator[Config, None, None]:
    """Create and set a test configuration."""
    cfg = Config(
        grove_root=grove_root,
        output_mode=OutputMode.AGENT,  # Use agent mode for tests
        verbose=False,
    )
    set_config(cfg)
    yield cfg


@pytest.fixture
def agent_mode() -> Generator[None, None, None]:
    """Set GF_AGENT environment variable for test."""
    os.environ["GF_AGENT"] = "1"
    yield
    del os.environ["GF_AGENT"]
