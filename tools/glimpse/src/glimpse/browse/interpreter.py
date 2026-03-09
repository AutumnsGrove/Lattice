"""Natural language instruction parser for Glimpse browse.

Converts human instructions like "click the Posts link, then scroll down"
into structured ActionStep objects that the executor can run.
"""

import re
from dataclasses import dataclass


@dataclass
class ActionStep:
    """A single browsing action parsed from natural language."""

    verb: str  # "click", "fill", "hover", "scroll", "wait", "press", "goto"
    target: str = ""  # Element description (for click/fill/hover)
    value: str = ""  # Value to type (for fill)
    raw: str = ""  # Original instruction text


# Patterns for parsing natural language instructions
_CLICK_PATTERN = re.compile(r"^click\s+(?:on\s+)?(?:the\s+)?(.+)", re.IGNORECASE)
_FILL_PATTERN = re.compile(r"^fill\s+(?:the\s+)?(.+?)\s+with\s+(.+)", re.IGNORECASE)
_TYPE_PATTERN = re.compile(r"^type\s+(.+?)\s+into\s+(?:the\s+)?(.+)", re.IGNORECASE)
_HOVER_PATTERN = re.compile(r"^hover\s+(?:over\s+)?(?:the\s+)?(.+)", re.IGNORECASE)
_SCROLL_PATTERN = re.compile(r"^scroll\s+(up|down)(?:\s+(\d+))?", re.IGNORECASE)
_WAIT_PATTERN = re.compile(r"^wait(?:\s+(\d+)\s*s?)?$", re.IGNORECASE)
_PRESS_PATTERN = re.compile(r"^press\s+(.+)", re.IGNORECASE)
_GOTO_PATTERN = re.compile(r"^(?:go\s+to|navigate\s+to|visit)\s+(.+)", re.IGNORECASE)


def parse_instructions(text: str) -> list[ActionStep]:
    """Parse a natural language instruction string into action steps.

    Splits on "then", commas (when followed by a verb), and newlines.
    Each segment is matched against known patterns.

    Examples:
        "click the Posts link" -> [ActionStep(verb="click", target="the Posts link")]
        "click Posts, then scroll down" -> [ActionStep(click), ActionStep(scroll)]
        "fill email with test@example.com" -> [ActionStep(verb="fill", target="email", value="test@example.com")]
    """
    # Split on "then" (with optional commas) and standalone commas before verbs
    segments = re.split(
        r",?\s*then\s+|,\s*(?=(?:click|fill|type|hover|scroll|wait|press|go\s+to|navigate|visit)\b)",
        text.strip(),
        flags=re.IGNORECASE,
    )

    steps = []
    for segment in segments:
        segment = segment.strip()
        if not segment:
            continue
        step = _parse_single(segment)
        steps.append(step)

    return steps


def _parse_single(text: str) -> ActionStep:
    """Parse a single instruction segment into an ActionStep."""
    # Click
    m = _CLICK_PATTERN.match(text)
    if m:
        return ActionStep(verb="click", target=m.group(1).strip(), raw=text)

    # Fill (fill X with Y)
    m = _FILL_PATTERN.match(text)
    if m:
        return ActionStep(verb="fill", target=m.group(1).strip(), value=m.group(2).strip(), raw=text)

    # Type (type Y into X)
    m = _TYPE_PATTERN.match(text)
    if m:
        return ActionStep(verb="fill", target=m.group(2).strip(), value=m.group(1).strip(), raw=text)

    # Hover
    m = _HOVER_PATTERN.match(text)
    if m:
        return ActionStep(verb="hover", target=m.group(1).strip(), raw=text)

    # Scroll
    m = _SCROLL_PATTERN.match(text)
    if m:
        direction = m.group(1).lower()
        amount = m.group(2) or "3"
        return ActionStep(verb="scroll", value=f"{direction}:{amount}", raw=text)

    # Wait
    m = _WAIT_PATTERN.match(text)
    if m:
        seconds = m.group(1) or "1"
        return ActionStep(verb="wait", value=seconds, raw=text)

    # Press key
    m = _PRESS_PATTERN.match(text)
    if m:
        return ActionStep(verb="press", value=m.group(1).strip(), raw=text)

    # Go to / navigate
    m = _GOTO_PATTERN.match(text)
    if m:
        return ActionStep(verb="goto", value=m.group(1).strip(), raw=text)

    # Unrecognized — preserve as raw for potential Lumen fallback
    return ActionStep(verb="unknown", raw=text)
