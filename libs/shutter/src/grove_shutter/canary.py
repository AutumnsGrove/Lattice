"""
Canary check for prompt injection detection (Phase 1).

Two-phase detection:
1. Heuristic checks (free) - regex patterns, Unicode, Base64
2. Cheap LLM check - minimal extraction with output analysis
"""

import re
from typing import Optional, Tuple

import httpx

from grove_shutter.config import get_api_key, get_canary_settings, is_dry_run
from grove_shutter.models import PromptInjectionDetails


# Regex patterns for common prompt injection attempts
# Format: (pattern, type, base_confidence)
INJECTION_PATTERNS = [
    # High confidence - clearly malicious (0.85-0.95)
    (r"ignore\s+(all\s+)?previous\s+instructions?", "instruction_override", 0.95),
    (r"disregard\s+(all|previous|above)", "instruction_override", 0.90),
    (r"override\s+(instructions?|rules?|guidelines?)", "instruction_override", 0.90),
    (r"new\s+instructions?:", "instruction_override", 0.85),
    (r"jailbreak", "jailbreak_attempt", 0.90),
    (r"dan\s+mode", "jailbreak_attempt", 0.85),
    (r"ignore\s+safety", "safety_bypass", 0.90),
    (r"<\s*system\s*>", "delimiter_injection", 0.90),
    (r"\[inst\]|\[/inst\]", "delimiter_injection", 0.85),

    # Medium-high confidence - very suspicious (0.75-0.85)
    (r"(reveal|show|print|output)\s+(your\s+)?(system\s+)?prompt", "prompt_leak", 0.85),
    (r"```\s*system", "delimiter_injection", 0.80),
    (r"forget\s+(everything|all|previous)", "memory_wipe", 0.80),
    (r"(developer|admin|system)\s+mode", "mode_switch", 0.75),

    # Medium confidence - could be legitimate content (0.50-0.70)
    (r"you\s+are\s+now\s+a?", "role_hijack", 0.70),
    (r"pretend\s+(you\s+are|to\s+be)", "role_hijack", 0.65),
    (r"act\s+as\s+(a\s+)?", "role_hijack", 0.50),  # Often in normal content
]

# Unicode ranges that can hide invisible instructions
# Format: (start, end, char_type, confidence)
# Note: Zero-width and word joiners are VERY common in legitimate content
# from CMS systems, rich text editors, and internationalization.
# Only Tag Characters are truly suspicious (deprecated, no legit use).
SUSPICIOUS_UNICODE_RANGES = [
    (0xE0000, 0xE007F, "tag_characters", 0.85),  # Unicode Tag Characters - truly suspicious
    (0x200B, 0x200F, "zero_width", 0.35),  # Zero-width - common in CMS/i18n, low weight
    (0x2060, 0x206F, "word_joiners", 0.30),  # Word joiners - common in rich text, low weight
    (0xFEFF, 0xFEFF, "bom", 0.20),  # Byte order mark - usually legitimate
]

# Base64 pattern for encoded payloads
BASE64_PATTERN = re.compile(r"[A-Za-z0-9+/]{40,}={0,2}")

# LLM output analysis indicator weights
INDICATOR_WEIGHTS = {
    "instruction_following": 0.85,  # Strong indicator
    "meta_discussion": 0.70,        # Moderate indicator
    "topic_deviation": 0.65,        # Weaker, needs context
}

# Default confidence threshold for blocking extraction
# Can be overridden in config.toml [canary] block_threshold
BLOCK_THRESHOLD = 0.6


def get_block_threshold() -> float:
    """Get block threshold from config, with fallback to default."""
    settings = get_canary_settings()
    return settings.get("block_threshold", BLOCK_THRESHOLD)


def check_heuristics(content: str) -> list[Tuple[str, str, float]]:
    """
    Run free heuristic checks for prompt injection patterns.

    Returns ALL matches with their confidence scores, enabling
    multi-pattern boosting in the aggregation step.

    Args:
        content: Page content to analyze

    Returns:
        List of (injection_type, snippet, confidence) tuples
    """
    content_lower = content.lower()
    matches = []

    # Check all regex patterns
    for pattern, injection_type, base_confidence in INJECTION_PATTERNS:
        match = re.search(pattern, content_lower)
        if match:
            # Extract snippet around the match
            start = max(0, match.start() - 20)
            end = min(len(content), match.end() + 20)
            snippet = content[start:end]
            matches.append((injection_type, snippet, base_confidence))

    return matches


def check_unicode(content: str) -> Optional[Tuple[str, str, float]]:
    """
    Check for suspicious Unicode characters that could hide instructions.

    Args:
        content: Page content to analyze

    Returns:
        Tuple of (injection_type, snippet, confidence) if suspicious, None if clean
    """
    for char in content:
        code = ord(char)
        for start, end, char_type, confidence in SUSPICIOUS_UNICODE_RANGES:
            if start <= code <= end:
                # Find position for context
                idx = content.index(char)
                snippet = f"[Hidden {char_type} at position {idx}]"
                return (f"hidden_unicode_{char_type}", snippet, confidence)

    return None


def check_base64(content: str) -> Optional[Tuple[str, str, float]]:
    """
    Check for long Base64-encoded strings that could be payloads.

    Confidence scales with length - longer payloads are more suspicious.

    Args:
        content: Page content to analyze

    Returns:
        Tuple of (injection_type, snippet, confidence) if suspicious, None if clean
    """
    matches = BASE64_PATTERN.findall(content)
    for match in matches:
        length = len(match)
        # Only flag very long base64 strings (likely payloads, not images)
        if length > 100:
            # Confidence scales with length: 100 chars = 0.60, 600 chars = 0.95
            confidence = min(0.95, 0.60 + (length - 100) / 500)
            snippet = match[:50] + "..." + match[-10:]
            return ("base64_payload", snippet, confidence)

    return None


def aggregate_confidence(
    heuristic_matches: list[Tuple[str, str, float]],
    unicode_result: Optional[Tuple[str, str, float]],
    base64_result: Optional[Tuple[str, str, float]],
) -> Tuple[float, Optional[str], Optional[str], list[str]]:
    """
    Aggregate all signals into final confidence score.

    Uses max-based aggregation (not average) because a single high-confidence
    signal shouldn't be diluted by absence of other signals.

    Multi-pattern boost: 2+ patterns = +0.10, 3+ = +0.15 (capped at 0.99)
    Attackers often combine techniques, so multiple weak signals = strong detection.

    Weight overrides from config.toml [canary.weights] are applied to adjust
    confidence by injection type.

    Args:
        heuristic_matches: List of (type, snippet, confidence) from pattern matching
        unicode_result: Optional (type, snippet, confidence) from unicode check
        base64_result: Optional (type, snippet, confidence) from base64 check

    Returns:
        Tuple of (final_confidence, primary_type, primary_snippet, all_signals)
    """
    # Get weight overrides from config
    settings = get_canary_settings()
    weight_overrides = settings.get("weight_overrides", {})

    signals: list[str] = []
    max_confidence = 0.0
    primary_type: Optional[str] = None
    primary_snippet: Optional[str] = None

    # Process heuristic matches
    for injection_type, snippet, conf in heuristic_matches:
        # Apply weight override if configured
        if injection_type in weight_overrides:
            conf = weight_overrides[injection_type]

        signals.append(f"{injection_type}:{conf:.2f}")
        if conf > max_confidence:
            max_confidence = conf
            primary_type = injection_type
            primary_snippet = snippet

    # Boost for multiple patterns - attackers often combine techniques
    if len(heuristic_matches) >= 2:
        max_confidence = min(0.98, max_confidence + 0.10)
    if len(heuristic_matches) >= 3:
        max_confidence = min(0.99, max_confidence + 0.05)

    # Process unicode
    if unicode_result:
        u_type, u_snippet, u_conf = unicode_result
        signals.append(f"{u_type}:{u_conf:.2f}")
        if u_conf > max_confidence:
            max_confidence = u_conf
            primary_type = u_type
            primary_snippet = u_snippet

    # Process base64
    if base64_result:
        b_type, b_snippet, b_conf = base64_result
        signals.append(f"{b_type}:{b_conf:.2f}")
        if b_conf > max_confidence:
            max_confidence = b_conf
            primary_type = b_type
            primary_snippet = b_snippet

    return (max_confidence, primary_type, primary_snippet, signals)


async def run_canary_llm(content: str, query: str) -> Optional[PromptInjectionDetails]:
    """
    Run minimal LLM extraction and analyze output for injection indicators.

    Uses cheapest model tier with strict token limits.

    Args:
        content: Page content to analyze
        query: User's extraction query

    Returns:
        PromptInjectionDetails if injection detected, None if clean
    """
    if is_dry_run():
        # In dry-run mode, skip LLM check
        return None

    api_key = get_api_key("openrouter")
    if not api_key:
        # Can't run LLM check without API key
        return None

    # Build minimal canary prompt
    # Truncate content to reduce cost
    truncated_content = content[:5000] if len(content) > 5000 else content

    prompt = f"""Web page content:
---
{truncated_content}
---

{query}

Respond in 50 words or less based only on the content above."""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://github.com/AutumnsGrove/Shutter",
                    "X-Title": "Shutter Canary Check",
                },
                json={
                    "model": "meta-llama/llama-3.2-3b-instruct",  # Cheapest fast model
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 100,  # Strict limit for canary
                    "temperature": 0,
                },
            )
            response.raise_for_status()
            result = response.json()

            # Extract the response text
            if "choices" in result and len(result["choices"]) > 0:
                output = result["choices"][0]["message"]["content"]
                return analyze_canary_output(output, query)

    except Exception:
        # If canary LLM fails, we can't detect - but don't block
        # The main extraction will still run
        pass

    return None


def analyze_canary_output(output: str, original_query: str) -> Optional[PromptInjectionDetails]:
    """
    Analyze canary LLM output for signs of successful injection.

    Uses INDICATOR_WEIGHTS for confidence scoring.

    Args:
        output: The LLM's response
        original_query: The original user query

    Returns:
        PromptInjectionDetails if injection detected, None if clean
    """
    output_lower = output.lower()

    # Signs of instruction-following injection
    instruction_indicators = [
        "i will now",
        "as you requested",
        "certainly!",
        "of course!",
        "here is your",
        "as per your instructions",
        "following your directive",
        "i understand you want me to",
    ]

    for indicator in instruction_indicators:
        if indicator in output_lower:
            confidence = INDICATOR_WEIGHTS["instruction_following"]
            return PromptInjectionDetails(
                detected=True,
                type="instruction_following",
                snippet=output[:100],
                domain_flagged=confidence >= 0.7,
                confidence=confidence,
                signals=[f"instruction_following:{confidence:.2f}"],
            )

    # Signs of system/prompt discussion
    meta_indicators = [
        "my instructions",
        "my prompt",
        "my system",
        "i am an ai",
        "i'm an ai",
        "as an ai",
        "my programming",
        "my guidelines",
    ]

    for indicator in meta_indicators:
        if indicator in output_lower:
            confidence = INDICATOR_WEIGHTS["meta_discussion"]
            return PromptInjectionDetails(
                detected=True,
                type="meta_discussion",
                snippet=output[:100],
                domain_flagged=confidence >= 0.7,
                confidence=confidence,
                signals=[f"meta_discussion:{confidence:.2f}"],
            )

    # Check for completely off-topic response
    # This is a simple heuristic - if the output doesn't mention
    # any words from the query, it might be hijacked
    query_words = set(original_query.lower().split())
    output_words = set(output_lower.split())

    # Remove common words
    common_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been",
                    "being", "have", "has", "had", "do", "does", "did", "will",
                    "would", "could", "should", "may", "might", "must", "shall",
                    "can", "need", "dare", "ought", "used", "to", "of", "in",
                    "for", "on", "with", "at", "by", "from", "as", "into",
                    "through", "during", "before", "after", "above", "below",
                    "between", "under", "again", "further", "then", "once",
                    "what", "which", "who", "whom", "this", "that", "these",
                    "those", "am", "it", "its", "and", "but", "or", "nor",
                    "so", "yet", "both", "either", "neither", "not", "only",
                    "own", "same", "than", "too", "very", "just", "also"}

    query_meaningful = query_words - common_words
    output_meaningful = output_words - common_words

    # Check for overlap using prefix matching (simple stemming)
    # This handles cases like "prices" vs "pricing", "contain" vs "contains"
    def has_prefix_match(query_set: set, output_set: set, min_prefix: int = 4) -> bool:
        """Check if any query word prefix matches any output word prefix."""
        for q_word in query_set:
            if len(q_word) < min_prefix:
                continue
            q_prefix = q_word[:min_prefix]
            for o_word in output_set:
                if len(o_word) >= min_prefix and o_word[:min_prefix] == q_prefix:
                    return True
        return False

    # If there's no overlap and we have meaningful query words
    has_overlap = bool(query_meaningful & output_meaningful) or has_prefix_match(query_meaningful, output_meaningful)

    if query_meaningful and not has_overlap:
        # Check if it's a legitimate "not found" response
        not_found_phrases = ["not found", "no information", "doesn't contain",
                             "does not contain", "couldn't find", "could not find",
                             "not present", "not available", "not mentioned"]

        is_not_found = any(phrase in output_lower for phrase in not_found_phrases)

        if not is_not_found:
            confidence = INDICATOR_WEIGHTS["topic_deviation"]
            return PromptInjectionDetails(
                detected=True,
                type="topic_deviation",
                snippet=output[:100],
                domain_flagged=confidence >= 0.7,
                confidence=confidence,
                signals=[f"topic_deviation:{confidence:.2f}"],
            )

    return None


async def canary_check(content: str, query: str) -> Optional[PromptInjectionDetails]:
    """
    Run minimal extraction to detect prompt injection patterns.

    Phase 1 of 2-phase Canary approach with confidence scoring.

    Threshold behavior (configurable via config.toml [canary] block_threshold):
    - confidence >= block_threshold: Block extraction, flag domain
    - confidence < 0.3: Run LLM check for additional validation
    - confidence 0.3-threshold: Could be used for soft warnings (future)

    Args:
        content: Fetched page content
        query: User's extraction query

    Returns:
        PromptInjectionDetails if injection detected, None otherwise
    """
    # Get configurable threshold
    block_threshold = get_block_threshold()

    # Phase 1: Free heuristic checks - collect all signals
    heuristic_matches = check_heuristics(content)
    unicode_result = check_unicode(content)
    base64_result = check_base64(content)

    # Aggregate all heuristic signals
    confidence, primary_type, primary_snippet, signals = aggregate_confidence(
        heuristic_matches, unicode_result, base64_result
    )

    # If high confidence from heuristics alone, skip LLM check
    if confidence >= block_threshold and primary_type and primary_snippet:
        return PromptInjectionDetails(
            detected=True,
            type=primary_type,
            snippet=primary_snippet,
            domain_flagged=confidence >= 0.7,
            confidence=confidence,
            signals=signals,
        )

    # Phase 2: Cheap LLM check (only if heuristics inconclusive)
    if confidence < 0.3:
        llm_result = await run_canary_llm(content, query)
        if llm_result:
            # Combine LLM confidence with any weak heuristic signals
            combined_confidence = max(confidence + 0.2, llm_result.confidence)
            combined_signals = signals + llm_result.signals

            if combined_confidence >= block_threshold:
                return PromptInjectionDetails(
                    detected=True,
                    type=llm_result.type,
                    snippet=llm_result.snippet,
                    domain_flagged=combined_confidence >= 0.7,
                    confidence=combined_confidence,
                    signals=combined_signals,
                )

    # Clean or low-confidence - allow extraction
    return None
