"""
Configuration management - TOML config file, secrets.json, and environment variables.
"""

import json
import os
from pathlib import Path
from typing import Optional

import tomli


CONFIG_DIR = Path.home() / ".shutter"
CONFIG_PATH = CONFIG_DIR / "config.toml"
SECRETS_PATH = Path.cwd() / "secrets.json"


def ensure_config_dir() -> None:
    """Create ~/.shutter/ directory if it doesn't exist."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    """
    Load configuration from multiple sources.

    Priority (highest to lowest):
    1. Environment variables
    2. secrets.json in project root (dev mode)
    3. ~/.shutter/config.toml (user config)

    Returns:
        Merged configuration dictionary
    """
    config = {}

    # Load from ~/.shutter/config.toml if exists
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "rb") as f:
            toml_config = tomli.load(f)
            config.update(_flatten_config(toml_config))

    # Load from secrets.json if exists (dev mode)
    if SECRETS_PATH.exists():
        with open(SECRETS_PATH) as f:
            secrets = json.load(f)
            # Remove comment field if present
            secrets.pop("comment", None)
            config.update(secrets)

    return config


def _flatten_config(toml_config: dict) -> dict:
    """Flatten nested TOML config to simple key-value pairs."""
    result = {}

    # Handle [api] section
    if "api" in toml_config:
        api = toml_config["api"]
        if "openrouter_key" in api:
            result["openrouter_api_key"] = api["openrouter_key"]
        if "tavily_key" in api:
            result["tavily_api_key"] = api["tavily_key"]

    # Handle [defaults] section
    if "defaults" in toml_config:
        result.update(toml_config["defaults"])

    return result


def get_api_key(service: str) -> Optional[str]:
    """
    Get API key for service (OpenRouter, Tavily).

    Priority: environment variable > secrets.json > config.toml

    Args:
        service: Service name ("openrouter" or "tavily")

    Returns:
        API key string or None if not found
    """
    env_map = {
        "openrouter": "OPENROUTER_API_KEY",
        "tavily": "TAVILY_API_KEY",
    }

    key_map = {
        "openrouter": "openrouter_api_key",
        "tavily": "tavily_api_key",
    }

    service_lower = service.lower()

    # Check environment first (highest priority)
    env_var = env_map.get(service_lower)
    if env_var:
        env_value = os.getenv(env_var)
        if env_value:
            return env_value

    # Check config/secrets files
    config = load_config()
    config_key = key_map.get(service_lower)
    if config_key and config_key in config:
        value = config[config_key]
        # Skip placeholder values
        if value and not value.startswith("sk-or-v1-your-") and not value.startswith("tvly-your-"):
            return value

    return None


def is_dry_run() -> bool:
    """
    Check if dry-run mode is enabled.

    Set SHUTTER_DRY_RUN=1 or SHUTTER_DRY_RUN=true to enable.

    Returns:
        True if dry-run mode is enabled
    """
    return os.getenv("SHUTTER_DRY_RUN", "").lower() in ("1", "true", "yes")


def get_canary_settings() -> dict:
    """
    Get canary detection settings from config.

    Users can configure:
    - [canary] block_threshold (default 0.6)
    - [canary.weights] to override pattern confidence weights

    Example config.toml:
    ```toml
    [canary]
    block_threshold = 0.7

    [canary.weights]
    instruction_override = 0.90  # Lower than default 0.95
    role_hijack = 0.40           # Lower for "act as" false positives
    ```

    Returns:
        Dict with 'block_threshold' and 'weight_overrides'
    """
    settings = {
        "block_threshold": 0.6,  # Default
        "weight_overrides": {},  # Type -> confidence overrides
    }

    # Load from config file
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "rb") as f:
            toml_config = tomli.load(f)

        # Get [canary] section
        if "canary" in toml_config:
            canary = toml_config["canary"]
            if "block_threshold" in canary:
                settings["block_threshold"] = float(canary["block_threshold"])

            # Get [canary.weights] section
            if "weights" in canary:
                settings["weight_overrides"] = {
                    k: float(v) for k, v in canary["weights"].items()
                }

    return settings


def setup_config() -> None:
    """
    Interactive configuration setup on first run.

    Prompts for API keys and writes to ~/.shutter/config.toml.
    """
    print("Shutter Configuration Setup")
    print("=" * 40)
    print()

    # Ensure config directory exists
    ensure_config_dir()

    # Prompt for OpenRouter API key
    print("OpenRouter API key (required for LLM extraction):")
    print("  Get one at: https://openrouter.ai/keys")
    openrouter_key = input("  API Key: ").strip()

    # Prompt for Tavily API key (optional)
    print()
    print("Tavily API key (optional, for enhanced fetching):")
    print("  Get one at: https://tavily.com")
    tavily_key = input("  API Key (press Enter to skip): ").strip()

    # Prompt for default model
    print()
    print("Default model tier:")
    print("  fast     - Quick extractions (Cerebras/Groq)")
    print("  accurate - Complex extraction (DeepSeek)")
    print("  research - Web-optimized analysis (Qwen)")
    print("  code     - Technical documentation (Minimax)")
    default_model = input("  Default [fast]: ").strip() or "fast"

    # Write config file
    config_content = f'''# Shutter Configuration
# Generated by: shutter --setup

[api]
openrouter_key = "{openrouter_key}"
'''

    if tavily_key:
        config_content += f'tavily_key = "{tavily_key}"\n'

    config_content += f'''
[defaults]
model = "{default_model}"
max_tokens = 500
timeout = 30000
'''

    with open(CONFIG_PATH, "w") as f:
        f.write(config_content)

    print()
    print(f"Configuration saved to: {CONFIG_PATH}")
    print("You can edit this file directly to change settings.")
