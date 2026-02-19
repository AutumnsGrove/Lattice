"""
Swarm Agent - Parallel domain evaluation

Uses multiple concurrent Haiku calls to quickly evaluate domain candidates
for quality, pronounceability, memorability, and brand fit.

Supports tool calling when the provider supports it, with fallback to JSON prompts.
"""

import json
import re
import asyncio
import logging
from dataclasses import dataclass, field
from typing import Optional

from ..providers.base import ModelProvider, ToolCallError
from ..providers.tools import SWARM_TOOL
from ..config import config
from .prompts import SWARM_SYSTEM_PROMPT, format_swarm_prompt

logger = logging.getLogger(__name__)


@dataclass
class DomainEvaluation:
    """Evaluation result for a domain candidate."""
    domain: str
    score: float  # Overall quality 0-1
    worth_checking: bool
    pronounceable: bool = True
    memorable: bool = True
    brand_fit: bool = True
    email_friendly: bool = True
    flags: list[str] = field(default_factory=list)
    notes: str = ""

    @classmethod
    def from_dict(cls, data: dict) -> "DomainEvaluation":
        """Create from dict (parsed from JSON response)."""
        return cls(
            domain=data.get("domain", ""),
            score=float(data.get("score", 0.5)),
            worth_checking=bool(data.get("worth_checking", True)),
            pronounceable=bool(data.get("pronounceable", True)),
            memorable=bool(data.get("memorable", True)),
            brand_fit=bool(data.get("brand_fit", True)),
            email_friendly=bool(data.get("email_friendly", True)),
            flags=data.get("flags", []),
            notes=data.get("notes", ""),
        )

    @classmethod
    def quick_evaluate(cls, domain: str) -> "DomainEvaluation":
        """
        Quick heuristic evaluation without AI.

        Used as fallback when AI evaluation fails.
        """
        name = domain.rsplit(".", 1)[0]
        tld = domain.rsplit(".", 1)[-1] if "." in domain else ""

        # Length-based scoring
        length_score = 1.0 if len(name) <= 8 else max(0.3, 1.0 - (len(name) - 8) * 0.1)

        # TLD scoring
        tld_scores = {
            "com": 1.0,
            "co": 0.9,
            "io": 0.85,
            "dev": 0.8,
            "app": 0.8,
            "me": 0.75,
            "net": 0.7,
            "org": 0.7,
        }
        tld_score = tld_scores.get(tld, 0.5)

        # Pronounceability (no weird consonant clusters)
        consonant_clusters = re.findall(r'[bcdfghjklmnpqrstvwxyz]{4,}', name.lower())
        pronounceable = len(consonant_clusters) == 0

        # Numbers and hyphens are less ideal
        has_numbers = any(c.isdigit() for c in name)
        has_hyphens = "-" in name

        # Calculate overall score
        score = (length_score + tld_score) / 2
        if not pronounceable:
            score *= 0.7
        if has_numbers:
            score *= 0.8
        if has_hyphens:
            score *= 0.85

        flags = []
        if has_numbers:
            flags.append("contains numbers")
        if has_hyphens:
            flags.append("contains hyphens")
        if not pronounceable:
            flags.append("hard to pronounce")

        return cls(
            domain=domain,
            score=round(score, 2),
            worth_checking=score > 0.4,
            pronounceable=pronounceable,
            memorable=len(name) <= 12,
            brand_fit=score > 0.5,
            email_friendly=not has_numbers and not has_hyphens,
            flags=flags,
            notes=f"Quick eval: length={len(name)}, tld=.{tld}",
        )


class SwarmAgent:
    """
    Swarm agent for parallel domain evaluation.

    Splits candidates into chunks and evaluates them in parallel
    using a fast model (Haiku).
    """

    def __init__(
        self,
        provider: ModelProvider,
        model: Optional[str] = None,
        chunk_size: int = 10,
        max_concurrent: int = 12,
    ):
        """
        Initialize swarm agent.

        Args:
            provider: AI model provider to use
            model: Optional model override
            chunk_size: Domains per evaluation chunk
            max_concurrent: Maximum concurrent evaluations
        """
        self.provider = provider
        self.model = model
        self.chunk_size = chunk_size
        self.max_concurrent = max_concurrent

    async def evaluate(
        self,
        domains: list[str],
        vibe: str,
        business_name: str,
    ) -> list[DomainEvaluation]:
        """
        Evaluate domain candidates in parallel.

        Args:
            domains: List of domain names to evaluate
            vibe: Brand vibe for evaluation context
            business_name: Client's business name

        Returns:
            List of DomainEvaluation objects
        """
        if not domains:
            self.last_usage = {"input_tokens": 0, "output_tokens": 0}
            return []

        # Reset usage tracking for this batch
        self._chunk_usages = []

        # Split into chunks
        chunks = [
            domains[i:i + self.chunk_size]
            for i in range(0, len(domains), self.chunk_size)
        ]

        # Evaluate chunks in parallel
        semaphore = asyncio.Semaphore(self.max_concurrent)

        async def evaluate_chunk(chunk: list[str]) -> list[DomainEvaluation]:
            async with semaphore:
                return await self._evaluate_chunk(chunk, vibe, business_name)

        chunk_results = await asyncio.gather(
            *[evaluate_chunk(chunk) for chunk in chunks],
            return_exceptions=True
        )

        # Flatten results
        all_evaluations = []
        for i, result in enumerate(chunk_results):
            if isinstance(result, Exception):
                # Fallback to heuristic evaluation for failed chunks
                for domain in chunks[i]:
                    all_evaluations.append(DomainEvaluation.quick_evaluate(domain))
            else:
                all_evaluations.extend(result)

        # Aggregate usage from all chunks
        total_input = sum(u.get("input_tokens", 0) for u in self._chunk_usages)
        total_output = sum(u.get("output_tokens", 0) for u in self._chunk_usages)
        self.last_usage = {"input_tokens": total_input, "output_tokens": total_output}

        return all_evaluations

    async def _evaluate_chunk(
        self,
        domains: list[str],
        vibe: str,
        business_name: str,
    ) -> list[DomainEvaluation]:
        """
        Evaluate a single chunk of domains.

        Args:
            domains: Chunk of domains to evaluate
            vibe: Brand vibe
            business_name: Business name

        Returns:
            List of evaluations for this chunk
        """
        prompt = format_swarm_prompt(
            domains=domains,
            vibe=vibe,
            business_name=business_name,
        )

        evaluations = []

        # Try tool calling if provider supports it
        if self.provider.supports_tools:
            try:
                response = await self.provider.generate_with_tools(
                    prompt=prompt,
                    tools=[SWARM_TOOL],
                    system=SWARM_SYSTEM_PROMPT,
                    model=self.model,
                    max_tokens=2048,
                    temperature=0.3,
                    tool_choice=SWARM_TOOL.name,
                )

                self._chunk_usages.append({
                    "input_tokens": response.input_tokens,
                    "output_tokens": response.output_tokens,
                })

                if response.has_tool_call:
                    evaluations = self._parse_tool_call(response.tool_calls, domains)
                    logger.debug(f"Tool calling returned {len(evaluations)} evaluations")
                else:
                    logger.debug("Model didn't use tool, falling back to content parsing")
                    evaluations = self._parse_evaluations(response.content, domains)

            except (ToolCallError, Exception) as e:
                logger.warning(f"Tool calling failed, falling back to JSON prompt: {e}")
                evaluations = await self._evaluate_chunk_fallback(prompt, domains)
        else:
            evaluations = await self._evaluate_chunk_fallback(prompt, domains)

        return evaluations

    async def _evaluate_chunk_fallback(
        self,
        prompt: str,
        domains: list[str],
    ) -> list[DomainEvaluation]:
        """
        Evaluate chunk using traditional JSON prompt (fallback method).
        """
        response = await self.provider.generate(
            prompt=prompt,
            system=SWARM_SYSTEM_PROMPT,
            model=self.model,
            max_tokens=2048,
            temperature=0.3,
        )

        self._chunk_usages.append({
            "input_tokens": response.input_tokens,
            "output_tokens": response.output_tokens,
        })

        return self._parse_evaluations(response.content, domains)

    def _parse_tool_call(
        self,
        tool_calls: list,
        expected_domains: list[str],
    ) -> list[DomainEvaluation]:
        """
        Parse evaluation results from tool call.
        """
        evaluations = []
        parsed_domains = set()

        for tc in tool_calls:
            if tc.tool_name == SWARM_TOOL.name:
                eval_list = tc.arguments.get("evaluations", [])
                for eval_data in eval_list:
                    if isinstance(eval_data, dict) and "domain" in eval_data:
                        domain = eval_data["domain"].lower()
                        if domain not in parsed_domains:
                            evaluations.append(DomainEvaluation.from_dict(eval_data))
                            parsed_domains.add(domain)

        # Fill in missing domains with heuristic evaluation
        for domain in expected_domains:
            if domain.lower() not in parsed_domains:
                evaluations.append(DomainEvaluation.quick_evaluate(domain))

        return evaluations

    def _parse_evaluations(
        self,
        content: str,
        expected_domains: list[str],
    ) -> list[DomainEvaluation]:
        """
        Parse evaluation results from model response.

        Args:
            content: Model response content
            expected_domains: Domains we expected evaluations for

        Returns:
            List of DomainEvaluation objects
        """
        evaluations = []
        parsed_domains = set()

        # Try to extract JSON
        try:
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                data = json.loads(json_match.group())
                eval_list = data.get("evaluations", [])
                for eval_data in eval_list:
                    if isinstance(eval_data, dict) and "domain" in eval_data:
                        domain = eval_data["domain"].lower()
                        if domain not in parsed_domains:
                            evaluations.append(DomainEvaluation.from_dict(eval_data))
                            parsed_domains.add(domain)
        except json.JSONDecodeError:
            pass

        # Fill in missing domains with heuristic evaluation
        for domain in expected_domains:
            if domain.lower() not in parsed_domains:
                evaluations.append(DomainEvaluation.quick_evaluate(domain))

        return evaluations

    def filter_worth_checking(
        self,
        evaluations: list[DomainEvaluation],
        min_score: float = 0.4,
    ) -> list[DomainEvaluation]:
        """
        Filter evaluations to only those worth checking availability.

        Args:
            evaluations: All evaluations
            min_score: Minimum score to include

        Returns:
            Filtered list of evaluations
        """
        return [
            e for e in evaluations
            if e.worth_checking and e.score >= min_score
        ]

    def rank_evaluations(
        self,
        evaluations: list[DomainEvaluation],
    ) -> list[DomainEvaluation]:
        """
        Rank evaluations by score (highest first).

        Args:
            evaluations: Evaluations to rank

        Returns:
            Sorted list of evaluations
        """
        return sorted(evaluations, key=lambda e: e.score, reverse=True)
