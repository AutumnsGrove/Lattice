"""
Tool definitions for AI model function calling.

Defines the tools models can use for domain generation and evaluation.
Includes format converters for different provider APIs (Anthropic vs OpenAI).
"""

from typing import Dict, Any, List
from .base import ToolDefinition


# =============================================================================
# Tool Definitions
# =============================================================================

DRIVER_TOOL = ToolDefinition(
    name="generate_domain_candidates",
    description="Generate domain name candidates for a business. Call this tool with your list of suggested domains.",
    parameters={
        "type": "object",
        "properties": {
            "domains": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of domain candidates (e.g., ['example.com', 'mysite.io']). Each must be a valid domain with TLD."
            }
        },
        "required": ["domains"]
    }
)

SWARM_TOOL = ToolDefinition(
    name="evaluate_domains",
    description="Evaluate domain candidates for quality, memorability, and brand fit. Call this tool with your evaluations.",
    parameters={
        "type": "object",
        "properties": {
            "evaluations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "domain": {
                            "type": "string",
                            "description": "The domain being evaluated"
                        },
                        "score": {
                            "type": "number",
                            "minimum": 0,
                            "maximum": 1,
                            "description": "Overall quality score from 0 to 1"
                        },
                        "worth_checking": {
                            "type": "boolean",
                            "description": "Whether this domain is worth checking availability"
                        },
                        "pronounceable": {
                            "type": "boolean",
                            "description": "Easy to pronounce aloud"
                        },
                        "memorable": {
                            "type": "boolean",
                            "description": "Easy to remember"
                        },
                        "brand_fit": {
                            "type": "boolean",
                            "description": "Fits the brand vibe"
                        },
                        "email_friendly": {
                            "type": "boolean",
                            "description": "Works well as an email address"
                        },
                        "flags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of concerns (e.g., 'contains hyphen', 'hard to spell')"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Brief explanation of the evaluation"
                        }
                    },
                    "required": ["domain", "score", "worth_checking"]
                },
                "description": "Array of domain evaluations"
            }
        },
        "required": ["evaluations"]
    }
)


# =============================================================================
# Format Converters
# =============================================================================

def to_anthropic_tool(tool: ToolDefinition) -> Dict[str, Any]:
    """Convert ToolDefinition to Anthropic's tool format."""
    return {
        "name": tool.name,
        "description": tool.description,
        "input_schema": tool.parameters
    }


def to_openai_tool(tool: ToolDefinition) -> Dict[str, Any]:
    """Convert ToolDefinition to OpenAI's tool format (also used by Kimi, DeepSeek)."""
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.parameters
        }
    }


def to_cloudflare_tool(tool: ToolDefinition) -> Dict[str, Any]:
    """Convert ToolDefinition to Cloudflare Workers AI tool format."""
    # Cloudflare uses a format similar to OpenAI
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.parameters
        }
    }


def tools_to_anthropic(tools: List[ToolDefinition]) -> List[Dict[str, Any]]:
    """Convert list of tools to Anthropic format."""
    return [to_anthropic_tool(t) for t in tools]


def tools_to_openai(tools: List[ToolDefinition]) -> List[Dict[str, Any]]:
    """Convert list of tools to OpenAI format."""
    return [to_openai_tool(t) for t in tools]


def tools_to_cloudflare(tools: List[ToolDefinition]) -> List[Dict[str, Any]]:
    """Convert list of tools to Cloudflare format."""
    return [to_cloudflare_tool(t) for t in tools]
