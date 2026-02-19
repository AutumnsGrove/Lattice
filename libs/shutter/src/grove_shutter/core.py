"""
Core shutter() function - main entry point for the distillation service.
"""

from typing import Optional

from grove_shutter.canary import canary_check
from grove_shutter.config import is_dry_run
from grove_shutter.database import add_offender, get_offender, should_skip_fetch
from grove_shutter.extraction import extract_content
from grove_shutter.fetch import FetchError, extract_domain, fetch_url
from grove_shutter.models import PromptInjectionDetails, ShutterResponse


async def shutter(
    url: str,
    query: str,
    model: str = "fast",
    max_tokens: int = 500,
    extended_query: Optional[str] = None,
    timeout: int = 30000,
) -> ShutterResponse:
    """
    Fetch and distill web content through LLM extraction.

    This is the main entry point for Shutter. It orchestrates:
    1. Offenders list check (skip known bad domains)
    2. URL fetching with HTML extraction
    3. Canary check for prompt injection detection
    4. Full LLM extraction (only if Canary passes)

    Args:
        url: URL to fetch
        query: What to extract from the page
        model: Model preference (fast/accurate/research/code)
        max_tokens: Maximum output tokens
        extended_query: Additional extraction instructions
        timeout: Fetch timeout in milliseconds

    Returns:
        ShutterResponse with extracted content or prompt injection details
    """
    # Extract domain for offenders tracking
    domain = extract_domain(url)

    # Step 1: Check offenders list
    if should_skip_fetch(domain):
        offender = get_offender(domain)
        detection_count = offender.detection_count if offender else 3
        max_conf = offender.max_confidence if offender else 1.0

        return ShutterResponse(
            url=url,
            extracted=None,
            tokens_input=0,
            tokens_output=0,
            model_used="",
            prompt_injection=PromptInjectionDetails(
                detected=True,
                type="domain_blocked",
                snippet=f"Domain has {detection_count} prior injection detections. Fetch skipped.",
                domain_flagged=True,
                confidence=max_conf,
                signals=[f"blocked_count:{detection_count}"],
            ),
        )

    # Step 2: Fetch content
    try:
        content = await fetch_url(url, timeout)
    except FetchError as e:
        return ShutterResponse(
            url=url,
            extracted=None,
            tokens_input=0,
            tokens_output=0,
            model_used="",
            prompt_injection=PromptInjectionDetails(
                detected=False,
                type="fetch_error",
                snippet=str(e),
                domain_flagged=False,
            ),
        )

    # Check if we got any content
    if not content or len(content.strip()) == 0:
        return ShutterResponse(
            url=url,
            extracted=None,
            tokens_input=0,
            tokens_output=0,
            model_used="",
            prompt_injection=PromptInjectionDetails(
                detected=False,
                type="empty_content",
                snippet="Page returned no extractable content",
                domain_flagged=False,
            ),
        )

    # Step 3: Run Canary check (unless in dry-run mode)
    if not is_dry_run():
        injection = await canary_check(content, query)
        if injection:
            # Add to offenders list with confidence
            add_offender(domain, injection.type, injection.confidence)

            # Count content tokens approximately (1 token ≈ 4 chars)
            tokens_input = len(content) // 4

            return ShutterResponse(
                url=url,
                extracted=None,
                tokens_input=tokens_input,
                tokens_output=0,
                model_used="",
                prompt_injection=injection,
            )

    # Step 4: Full extraction (Phase 2)
    try:
        extracted, tokens_in, tokens_out, model_used = await extract_content(
            content=content,
            query=query,
            model=model,
            max_tokens=max_tokens,
            extended_query=extended_query,
        )
    except ValueError as e:
        # Configuration error (no API key)
        return ShutterResponse(
            url=url,
            extracted=None,
            tokens_input=0,
            tokens_output=0,
            model_used="",
            prompt_injection=PromptInjectionDetails(
                detected=False,
                type="config_error",
                snippet=str(e),
                domain_flagged=False,
            ),
        )
    except RuntimeError as e:
        # Extraction error
        return ShutterResponse(
            url=url,
            extracted=None,
            tokens_input=0,
            tokens_output=0,
            model_used="",
            prompt_injection=PromptInjectionDetails(
                detected=False,
                type="extraction_error",
                snippet=str(e),
                domain_flagged=False,
            ),
        )

    # Step 5: Return successful extraction
    return ShutterResponse(
        url=url,
        extracted=extracted,
        tokens_input=tokens_in,
        tokens_output=tokens_out,
        model_used=model_used,
        prompt_injection=None,
    )
