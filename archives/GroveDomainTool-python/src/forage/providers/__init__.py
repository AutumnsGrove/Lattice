"""
AI model providers for grove-domain-tool

Supports multiple AI providers with a common interface.
Providers: DeepSeek, OpenRouter, Mock
"""

from .base import (
    ModelProvider, ModelResponse, ProviderError, RateLimitError,
    AuthenticationError, ToolCallError, ToolDefinition, ToolCallResult
)
from .deepseek import DeepSeekProvider
from .openrouter import OpenRouterProvider
from .mock import MockProvider
from .tools import DRIVER_TOOL, SWARM_TOOL, tools_to_anthropic, tools_to_openai

__all__ = [
    # Base classes and types
    "ModelProvider",
    "ModelResponse",
    "ProviderError",
    "RateLimitError",
    "AuthenticationError",
    "ToolCallError",
    "ToolDefinition",
    "ToolCallResult",
    # Providers
    "DeepSeekProvider",
    "OpenRouterProvider",
    "MockProvider",
    # Tools
    "DRIVER_TOOL",
    "SWARM_TOOL",
    "tools_to_anthropic",
    "tools_to_openai",
]


def get_provider(name: str, **kwargs) -> ModelProvider:
    """
    Factory function to get a provider by name.

    Args:
        name: Provider name ('deepseek', 'openrouter', 'mock')
        **kwargs: Provider-specific options

    Returns:
        Configured ModelProvider instance

    Raises:
        ValueError: If provider name is unknown
    """
    providers = {
        "deepseek": DeepSeekProvider,
        "openrouter": OpenRouterProvider,
        "mock": MockProvider,
    }

    if name not in providers:
        raise ValueError(f"Unknown provider: {name}. Valid options: {list(providers.keys())}")

    return providers[name](**kwargs)
