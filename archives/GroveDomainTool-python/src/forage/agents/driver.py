"""
Driver Agent - Generates domain name candidates

The driver agent is the "brain" that generates creative domain suggestions
based on client preferences and learns from previous batch results.

Supports tool calling when the provider supports it, with fallback to JSON prompts.
"""

import json
import re
import logging
from dataclasses import dataclass, field
from typing import Optional

from ..providers.base import ModelProvider, ModelResponse, ToolCallError
from ..providers.tools import DRIVER_TOOL
from ..config import config
from .prompts import DRIVER_SYSTEM_PROMPT, format_driver_prompt

logger = logging.getLogger(__name__)


@dataclass
class DomainCandidate:
    """A generated domain name candidate."""
    domain: str
    batch_num: int
    tld: str = field(init=False)

    def __post_init__(self):
        """Extract TLD from domain."""
        parts = self.domain.lower().split(".")
        self.tld = parts[-1] if len(parts) > 1 else ""

    @property
    def name(self) -> str:
        """Domain name without TLD."""
        return self.domain.rsplit(".", 1)[0]

    def __str__(self) -> str:
        return self.domain

    def __hash__(self) -> int:
        return hash(self.domain.lower())

    def __eq__(self, other) -> bool:
        if isinstance(other, DomainCandidate):
            return self.domain.lower() == other.domain.lower()
        if isinstance(other, str):
            return self.domain.lower() == other.lower()
        return False


@dataclass
class PreviousResults:
    """Summary of previous batch results for context."""
    checked_domains: list[str] = field(default_factory=list)
    available_domains: list[str] = field(default_factory=list)
    target_count: int = 25

    @property
    def checked_count(self) -> int:
        return len(self.checked_domains)

    @property
    def available_count(self) -> int:
        return len(self.available_domains)

    def get_tried_summary(self) -> str:
        """Summarize what's been tried."""
        if not self.checked_domains:
            return "Nothing checked yet"

        # Group by TLD
        tld_counts: dict[str, int] = {}
        for domain in self.checked_domains:
            tld = domain.split(".")[-1]
            tld_counts[tld] = tld_counts.get(tld, 0) + 1

        parts = [f".{tld}: {count}" for tld, count in sorted(tld_counts.items(), key=lambda x: -x[1])]
        return ", ".join(parts[:5])

    def get_available_summary(self) -> str:
        """Summarize available domains."""
        if not self.available_domains:
            return "None found yet"

        return ", ".join(self.available_domains[:10])

    def get_taken_patterns(self) -> str:
        """Identify patterns that were taken."""
        taken = set(self.checked_domains) - set(self.available_domains)
        if not taken:
            return "No clear patterns yet"

        # Find common prefixes/suffixes
        patterns = []

        # Group by base name (without common prefixes)
        common_prefixes = ["get", "try", "my", "the", "go", "use"]
        common_suffixes = ["hq", "app", "io", "labs", "studio"]

        base_names = set()
        for domain in taken:
            name = domain.rsplit(".", 1)[0].lower()
            for prefix in common_prefixes:
                if name.startswith(prefix):
                    name = name[len(prefix):]
                    break
            for suffix in common_suffixes:
                if name.endswith(suffix):
                    name = name[:-len(suffix)]
                    break
            if name:
                base_names.add(name)

        if len(base_names) < 5:
            patterns.append(f"Base names tried: {', '.join(list(base_names)[:5])}")

        return "; ".join(patterns) if patterns else "Various patterns all taken"

    def to_context_dict(self) -> dict:
        """Convert to dict for prompt formatting."""
        return {
            "checked_count": self.checked_count,
            "available_count": self.available_count,
            "target_count": self.target_count,
            "tried_summary": self.get_tried_summary(),
            "available_summary": self.get_available_summary(),
            "taken_patterns": self.get_taken_patterns(),
        }


class DriverAgent:
    """
    Driver agent for domain generation.

    Uses a capable model (Sonnet/K2) to generate creative domain candidates
    based on client preferences and previous results.
    """

    def __init__(
        self,
        provider: ModelProvider,
        model: Optional[str] = None,
    ):
        """
        Initialize driver agent.

        Args:
            provider: AI model provider to use
            model: Optional model override (uses provider default if not specified)
        """
        self.provider = provider
        self.model = model

    async def generate_candidates(
        self,
        business_name: str,
        tld_preferences: list[str],
        vibe: str,
        batch_num: int,
        count: int = 50,
        max_batches: int = 6,
        domain_idea: Optional[str] = None,
        keywords: Optional[str] = None,
        previous_results: Optional[PreviousResults] = None,
    ) -> list[DomainCandidate]:
        """
        Generate domain name candidates.

        Args:
            business_name: Client's business/project name
            tld_preferences: List of preferred TLDs
            vibe: Brand vibe (professional, creative, etc.)
            batch_num: Current batch number (1-indexed)
            count: Number of candidates to generate
            max_batches: Maximum number of batches
            domain_idea: Optional client-specified domain
            keywords: Optional keywords/themes
            previous_results: Previous batch results for context

        Returns:
            List of DomainCandidate objects
        """
        # Format the prompt
        prompt = format_driver_prompt(
            business_name=business_name,
            tld_preferences=tld_preferences,
            vibe=vibe,
            batch_num=batch_num,
            count=count,
            max_batches=max_batches,
            domain_idea=domain_idea,
            keywords=keywords,
            previous_results=previous_results.to_context_dict() if previous_results else None,
        )

        candidates = []

        # Try tool calling if provider supports it
        if self.provider.supports_tools:
            try:
                response = await self.provider.generate_with_tools(
                    prompt=prompt,
                    tools=[DRIVER_TOOL],
                    system=DRIVER_SYSTEM_PROMPT,
                    model=self.model,
                    max_tokens=4096,
                    temperature=0.8,
                    tool_choice=DRIVER_TOOL.name,
                )

                self.last_usage = {
                    "input_tokens": response.input_tokens,
                    "output_tokens": response.output_tokens,
                }

                # Parse tool call results
                if response.has_tool_call:
                    candidates = self._parse_tool_call(response.tool_calls, batch_num)
                    logger.debug(f"Tool calling returned {len(candidates)} candidates")
                else:
                    # Model responded without using tool, fall back to content parsing
                    logger.debug("Model didn't use tool, falling back to content parsing")
                    candidates = self._parse_candidates(response.content, batch_num)

            except (ToolCallError, Exception) as e:
                logger.warning(f"Tool calling failed, falling back to JSON prompt: {e}")
                candidates = await self._generate_with_fallback(prompt, batch_num)
        else:
            # Provider doesn't support tools, use JSON prompt
            candidates = await self._generate_with_fallback(prompt, batch_num)

        # Filter out previously checked domains
        if previous_results:
            checked_set = set(d.lower() for d in previous_results.checked_domains)
            candidates = [c for c in candidates if c.domain.lower() not in checked_set]

        return candidates[:count]

    async def _generate_with_fallback(
        self,
        prompt: str,
        batch_num: int,
    ) -> list[DomainCandidate]:
        """
        Generate candidates using traditional JSON prompt (fallback method).
        """
        response = await self.provider.generate(
            prompt=prompt,
            system=DRIVER_SYSTEM_PROMPT,
            model=self.model,
            max_tokens=4096,
            temperature=0.8,
        )

        self.last_usage = {
            "input_tokens": response.input_tokens,
            "output_tokens": response.output_tokens,
        }

        return self._parse_candidates(response.content, batch_num)

    def _parse_tool_call(
        self,
        tool_calls: list,
        batch_num: int,
    ) -> list[DomainCandidate]:
        """
        Parse domain candidates from tool call results.
        """
        candidates = []

        for tc in tool_calls:
            if tc.tool_name == DRIVER_TOOL.name:
                domains = tc.arguments.get("domains", [])
                for domain in domains:
                    if isinstance(domain, str) and self._is_valid_domain(domain):
                        candidates.append(DomainCandidate(
                            domain=domain.lower(),
                            batch_num=batch_num
                        ))

        # Deduplicate
        seen = set()
        unique = []
        for c in candidates:
            if c.domain.lower() not in seen:
                seen.add(c.domain.lower())
                unique.append(c)

        return unique

    def _parse_candidates(self, content: str, batch_num: int) -> list[DomainCandidate]:
        """
        Parse domain candidates from model response.

        Args:
            content: Model response content
            batch_num: Batch number for tracking

        Returns:
            List of DomainCandidate objects
        """
        candidates = []

        # Try to extract JSON
        try:
            # Find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                domains = data.get("domains", [])
                for domain in domains:
                    if self._is_valid_domain(domain):
                        candidates.append(DomainCandidate(domain=domain.lower(), batch_num=batch_num))
        except json.JSONDecodeError:
            pass

        # Fallback: extract domain-like patterns from text
        if not candidates:
            domain_pattern = r'\b([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,})\b'
            matches = re.findall(domain_pattern, content)
            for match in matches:
                if self._is_valid_domain(match):
                    candidates.append(DomainCandidate(domain=match.lower(), batch_num=batch_num))

        # Deduplicate while preserving order
        seen = set()
        unique_candidates = []
        for c in candidates:
            if c.domain.lower() not in seen:
                seen.add(c.domain.lower())
                unique_candidates.append(c)

        return unique_candidates

    def _is_valid_domain(self, domain: str) -> bool:
        """
        Check if a string is a valid domain name.

        Args:
            domain: Potential domain string

        Returns:
            True if valid domain format
        """
        if not domain or len(domain) < 4:
            return False

        # Must have at least one dot
        if "." not in domain:
            return False

        # Split into parts
        parts = domain.lower().split(".")

        # Check TLD
        tld = parts[-1]
        if len(tld) < 2 or not tld.isalpha():
            return False

        # Check name part
        name = parts[0]
        if len(name) < 1 or len(name) > 63:
            return False

        # Only alphanumeric and hyphens (not at start/end)
        if not re.match(r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?$', name):
            return False

        return True
