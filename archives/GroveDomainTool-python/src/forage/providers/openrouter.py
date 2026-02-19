"""
OpenRouter provider implementation

OpenRouter uses an OpenAI-compatible API with zero data retention.
Supports many models including DeepSeek, Cerebras, etc.
"""

import os
import json
from typing import Optional, List

from .base import (
    ModelProvider, ModelResponse, ProviderError, RateLimitError,
    AuthenticationError, ToolDefinition, ToolCallResult
)
from .tools import tools_to_openai


class OpenRouterProvider(ModelProvider):
    """
    OpenRouter provider.

    Uses OpenAI-compatible API. API key is read from:
    1. Constructor argument
    2. OPENROUTER_API_KEY environment variable
    """

    # OpenRouter API base URL
    BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: str = "deepseek/deepseek-chat",
        base_url: Optional[str] = None,
    ):
        """
        Initialize OpenRouter provider.

        Args:
            api_key: OpenRouter API key (falls back to env var)
            default_model: Default model to use (deepseek/deepseek-chat for V3.2)
            base_url: API base URL (defaults to OpenRouter's API)
        """
        self._api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        self._default_model = default_model
        self._base_url = base_url or self.BASE_URL
        self._client = None

    def _get_client(self):
        """Lazy initialization of OpenAI client for OpenRouter."""
        if self._client is None:
            if not self._api_key:
                raise AuthenticationError(
                    "No OpenRouter API key provided. Set OPENROUTER_API_KEY or pass api_key to constructor."
                )
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(
                    api_key=self._api_key,
                    base_url=self._base_url,
                    default_headers={
                        "HTTP-Referer": "https://forage.grove.place",
                        "X-Title": "Forage Domain Search",
                    }
                )
            except ImportError:
                raise ProviderError("openai package not installed. Run: pip install openai")
        return self._client

    @property
    def name(self) -> str:
        return "openrouter"

    @property
    def default_model(self) -> str:
        return self._default_model

    @property
    def supports_tools(self) -> bool:
        return True

    async def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        **kwargs
    ) -> ModelResponse:
        """Generate a response using OpenRouter."""
        client = self._get_client()
        model = model or self._default_model

        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )

            content = ""
            if response.choices and response.choices[0].message:
                content = response.choices[0].message.content or ""

            usage = {}
            if response.usage:
                usage = {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                }

            return ModelResponse(
                content=content,
                model=response.model,
                provider=self.name,
                usage=usage,
                raw_response=response,
            )

        except Exception as e:
            error_str = str(e).lower()

            if "rate" in error_str or "429" in error_str:
                raise RateLimitError(f"OpenRouter rate limit exceeded: {e}")

            if "auth" in error_str or "401" in error_str or "api key" in error_str:
                raise AuthenticationError(f"OpenRouter authentication failed: {e}")

            raise ProviderError(f"OpenRouter API error: {e}")

    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[ToolDefinition],
        *,
        system: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
        tool_choice: Optional[str] = None,
        **kwargs
    ) -> ModelResponse:
        """Generate a response using OpenRouter with tool calling."""
        client = self._get_client()
        model = model or self._default_model

        try:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            request_kwargs = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "tools": tools_to_openai(tools),
            }

            # Handle tool_choice
            if tool_choice:
                if tool_choice == "auto":
                    request_kwargs["tool_choice"] = "auto"
                elif tool_choice == "any":
                    request_kwargs["tool_choice"] = "required"
                else:
                    request_kwargs["tool_choice"] = {"type": "function", "function": {"name": tool_choice}}

            response = await client.chat.completions.create(**request_kwargs)

            content = ""
            tool_calls = []

            if response.choices and response.choices[0].message:
                msg = response.choices[0].message
                content = msg.content or ""

                if msg.tool_calls:
                    for tc in msg.tool_calls:
                        try:
                            args = json.loads(tc.function.arguments)
                        except json.JSONDecodeError:
                            args = {"raw": tc.function.arguments}

                        tool_calls.append(ToolCallResult(
                            tool_name=tc.function.name,
                            arguments=args,
                            raw_response=tc
                        ))

            usage = {}
            if response.usage:
                usage = {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                }

            return ModelResponse(
                content=content,
                model=response.model,
                provider=self.name,
                usage=usage,
                raw_response=response,
                tool_calls=tool_calls,
            )

        except Exception as e:
            error_str = str(e).lower()

            if "rate" in error_str or "429" in error_str:
                raise RateLimitError(f"OpenRouter rate limit exceeded: {e}")

            if "auth" in error_str or "401" in error_str or "api key" in error_str:
                raise AuthenticationError(f"OpenRouter authentication failed: {e}")

            raise ProviderError(f"OpenRouter API error: {e}")