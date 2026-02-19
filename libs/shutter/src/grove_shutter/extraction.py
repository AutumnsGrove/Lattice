"""
Full extraction logic (Phase 2) - runs only if Canary passes.
"""

from typing import Optional, Tuple

import httpx

from grove_shutter.config import get_api_key, is_dry_run


# Mock response for dry-run mode
MOCK_RESPONSE = {
    "extracted": "[DRY RUN] Mock extraction result. In production, this would contain the actual extracted content from the web page based on your query.",
    "tokens_input": 1000,
    "tokens_output": 50,
}


def get_model_for_tier(tier: str) -> str:
    """
    Map model tier to actual OpenRouter model.

    Args:
        tier: One of fast/accurate/research/code

    Returns:
        OpenRouter model identifier
    """
    model_map = {
        "fast": "openai/gpt-oss-120b",  # Cerebras ~2000 tok/sec
        "accurate": "deepseek/deepseek-v3.2",
        "research": "alibaba/tongyi-deepresearch-30b-a3b",
        "code": "minimax/minimax-m2.1",
    }
    return model_map.get(tier.lower(), model_map["fast"])


def build_extraction_prompt(
    content: str,
    query: str,
    extended_query: Optional[str] = None,
) -> str:
    """
    Build the extraction prompt following PROMPTS.md design.

    Simple structure: content + query + grounding instruction.

    Args:
        content: Page content (markdown/text)
        query: What to extract
        extended_query: Additional extraction instructions

    Returns:
        Complete prompt string
    """
    prompt = f"""Web page content:
---
{content}
---

{query}"""

    if extended_query:
        prompt += f"""

Additional extraction guidance:
{extended_query}"""

    prompt += """

Respond concisely based only on the content above. If the requested information is not present, say "Not found in page content."
"""

    return prompt


async def extract_content(
    content: str,
    query: str,
    model: str = "fast",
    max_tokens: int = 500,
    extended_query: Optional[str] = None,
) -> Tuple[str, int, int, str]:
    """
    Run full LLM extraction on page content.

    Phase 2 of 2-phase approach. Only runs if Phase 1 (Canary) passes.

    Args:
        content: Fetched page content
        query: What to extract
        model: Model preference (fast/accurate/research/code)
        max_tokens: Maximum output tokens
        extended_query: Additional extraction instructions

    Returns:
        Tuple of (extracted_text, tokens_input, tokens_output, model_used)

    Raises:
        ValueError: If no API key is configured
        RuntimeError: If extraction fails
    """
    # Handle dry-run mode
    if is_dry_run():
        model_used = get_model_for_tier(model)
        return (
            MOCK_RESPONSE["extracted"],
            MOCK_RESPONSE["tokens_input"],
            MOCK_RESPONSE["tokens_output"],
            model_used,
        )

    # Get API key
    api_key = get_api_key("openrouter")
    if not api_key:
        raise ValueError(
            "OpenRouter API key not configured. "
            "Set OPENROUTER_API_KEY env var or run 'shutter --setup'"
        )

    # Build prompt
    prompt = build_extraction_prompt(content, query, extended_query)

    # Get model
    model_used = get_model_for_tier(model)

    # Call OpenRouter
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://github.com/AutumnsGrove/Shutter",
                    "X-Title": "Shutter Content Extraction",
                },
                json={
                    "model": model_used,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0,  # Critical for consistent extraction
                },
            )
            response.raise_for_status()
            result = response.json()

    except httpx.TimeoutException:
        raise RuntimeError("OpenRouter request timed out")
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"OpenRouter API error: {e.response.status_code}")
    except Exception as e:
        raise RuntimeError(f"Extraction failed: {str(e)}")

    # Parse response
    if "choices" not in result or len(result["choices"]) == 0:
        raise RuntimeError("OpenRouter returned empty response")

    extracted = result["choices"][0]["message"]["content"]

    # Get token usage
    usage = result.get("usage", {})
    tokens_input = usage.get("prompt_tokens", 0)
    tokens_output = usage.get("completion_tokens", 0)

    return (extracted, tokens_input, tokens_output, model_used)
