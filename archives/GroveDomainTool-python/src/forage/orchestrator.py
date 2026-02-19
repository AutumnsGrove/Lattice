"""
Domain Search Orchestrator

The main search loop that coordinates:
1. Driver agent generating domain candidates
2. Swarm agent evaluating candidates
3. RDAP checker verifying availability
4. Results aggregation and scoring

Designed to run in batches, with state persisted between batches.
"""

import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

from .providers.base import ModelProvider
from .providers.mock import MockProvider
from .agents.driver import DriverAgent, DomainCandidate, PreviousResults
from .agents.swarm import SwarmAgent, DomainEvaluation
from .checker import check_domain, DomainResult
from .pricing import get_batch_pricing, DomainPrice
from .quiz.schema import InitialQuiz, FollowupQuiz
from .quiz.followup import FollowupQuizGenerator
from .config import config


class SearchStatus(str, Enum):
    """Status of a domain search job."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    NEEDS_FOLLOWUP = "needs_followup"
    FAILED = "failed"


@dataclass
class DomainSearchResult:
    """A single domain result with all metadata."""
    domain: str
    tld: str
    status: str  # "available", "registered", "unknown"
    score: float = 0.0
    price_cents: Optional[int] = None
    price_category: str = "unknown"
    evaluation: Optional[DomainEvaluation] = None
    batch_num: int = 0

    @property
    def is_good(self) -> bool:
        """Is this a good result (available with decent score)?"""
        return self.status == "available" and self.score >= 0.4

    @property
    def price_dollars(self) -> float:
        """Price in dollars."""
        return (self.price_cents or 0) / 100.0

    def to_dict(self) -> dict:
        return {
            "domain": self.domain,
            "tld": self.tld,
            "status": self.status,
            "score": self.score,
            "price_cents": self.price_cents,
            "price_category": self.price_category,
            "batch_num": self.batch_num,
        }


@dataclass
class UsageStats:
    """Token usage and cost tracking."""
    input_tokens: int = 0
    output_tokens: int = 0

    # Approximate costs per 1M tokens (as of Dec 2024)
    # Sonnet: $3 input, $15 output
    # Haiku: $0.25 input, $1.25 output
    SONNET_INPUT_COST = 3.0 / 1_000_000
    SONNET_OUTPUT_COST = 15.0 / 1_000_000
    HAIKU_INPUT_COST = 0.25 / 1_000_000
    HAIKU_OUTPUT_COST = 1.25 / 1_000_000

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens

    @property
    def estimated_cost_usd(self) -> float:
        """Estimate cost assuming mix of Sonnet (driver) and Haiku (swarm)."""
        # Rough estimate: 20% Sonnet, 80% Haiku
        sonnet_input = self.input_tokens * 0.2
        sonnet_output = self.output_tokens * 0.2
        haiku_input = self.input_tokens * 0.8
        haiku_output = self.output_tokens * 0.8

        return (
            sonnet_input * self.SONNET_INPUT_COST +
            sonnet_output * self.SONNET_OUTPUT_COST +
            haiku_input * self.HAIKU_INPUT_COST +
            haiku_output * self.HAIKU_OUTPUT_COST
        )

    def add(self, input_tokens: int, output_tokens: int):
        """Add token counts from an API call."""
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens

    def to_dict(self) -> dict:
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "estimated_cost_usd": round(self.estimated_cost_usd, 4),
        }


@dataclass
class SearchState:
    """Persistent state for a search job."""
    job_id: str
    client_id: str
    status: SearchStatus = SearchStatus.PENDING
    batch_num: int = 0
    quiz: Optional[InitialQuiz] = None
    all_results: list[DomainSearchResult] = field(default_factory=list)
    checked_domains: list[str] = field(default_factory=list)
    available_domains: list[str] = field(default_factory=list)
    usage: UsageStats = field(default_factory=UsageStats)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    error: Optional[str] = None

    @property
    def good_results(self) -> list[DomainSearchResult]:
        """Get all good results."""
        return [r for r in self.all_results if r.is_good]

    @property
    def good_count(self) -> int:
        """Number of good results found."""
        return len(self.good_results)

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "client_id": self.client_id,
            "status": self.status.value,
            "batch_num": self.batch_num,
            "quiz": self.quiz.to_dict() if self.quiz else None,
            "results_count": len(self.all_results),
            "good_count": self.good_count,
            "checked_count": len(self.checked_domains),
            "usage": self.usage.to_dict(),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "error": self.error,
        }

    def update_timestamp(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.utcnow().isoformat()


@dataclass
class BatchResult:
    """Result of a single batch."""
    batch_num: int
    candidates_generated: int
    candidates_evaluated: int
    domains_checked: int
    domains_available: int
    new_good_results: int
    duration_seconds: float


class DomainSearchOrchestrator:
    """
    Main orchestrator for domain searches.

    Coordinates the full search loop:
    1. Generate candidates with driver agent
    2. Evaluate with swarm agent
    3. Check availability via RDAP
    4. Aggregate and score results
    """

    def __init__(
        self,
        driver_provider: Optional[ModelProvider] = None,
        swarm_provider: Optional[ModelProvider] = None,
        use_mock: bool = False,
    ):
        """
        Initialize orchestrator.

        Args:
            driver_provider: Provider for driver agent (defaults to mock if None)
            swarm_provider: Provider for swarm agent (defaults to mock if None)
            use_mock: Force use of mock providers
        """
        if use_mock or driver_provider is None:
            driver_provider = MockProvider()
        if use_mock or swarm_provider is None:
            swarm_provider = MockProvider()

        self.driver = DriverAgent(driver_provider)
        self.swarm = SwarmAgent(swarm_provider)
        self.followup_generator = FollowupQuizGenerator(driver_provider)

    async def run_search(
        self,
        state: SearchState,
        max_batches: Optional[int] = None,
    ) -> SearchState:
        """
        Run the complete search loop.

        Args:
            state: Initial search state with quiz responses
            max_batches: Override for max batches (defaults to config)

        Returns:
            Updated search state
        """
        max_batches = max_batches or config.search.max_batches
        target = config.search.target_good_results

        state.status = SearchStatus.RUNNING
        state.update_timestamp()

        try:
            while state.batch_num < max_batches:
                # Check if we have enough good results
                if state.good_count >= target:
                    state.status = SearchStatus.COMPLETE
                    break

                # Run one batch
                state.batch_num += 1
                batch_result = await self.run_batch(state)

                state.update_timestamp()

            # Final status
            if state.good_count >= target:
                state.status = SearchStatus.COMPLETE
            else:
                state.status = SearchStatus.NEEDS_FOLLOWUP

        except Exception as e:
            state.status = SearchStatus.FAILED
            state.error = str(e)
            state.update_timestamp()

        return state

    async def run_batch(self, state: SearchState) -> BatchResult:
        """
        Run a single batch of the search.

        Args:
            state: Current search state

        Returns:
            BatchResult with batch statistics
        """
        import time
        start_time = time.time()

        quiz = state.quiz
        if not quiz:
            raise ValueError("No quiz data in search state")

        # Build previous results context
        previous = PreviousResults(
            checked_domains=state.checked_domains,
            available_domains=state.available_domains,
            target_count=config.search.target_good_results,
        )

        # 1. Generate candidates
        candidates = await self.driver.generate_candidates(
            business_name=quiz.business_name,
            tld_preferences=quiz.tld_preferences,
            vibe=quiz.vibe,
            batch_num=state.batch_num,
            count=config.search.candidates_per_batch,
            domain_idea=quiz.domain_idea,
            keywords=quiz.keywords,
            previous_results=previous if state.batch_num > 1 else None,
        )

        # Track driver usage
        if hasattr(self.driver, 'last_usage'):
            state.usage.add(
                self.driver.last_usage.get("input_tokens", 0),
                self.driver.last_usage.get("output_tokens", 0),
            )

        # 2. Evaluate candidates with swarm
        evaluations = await self.swarm.evaluate(
            domains=[c.domain for c in candidates],
            vibe=quiz.vibe,
            business_name=quiz.business_name,
        )

        # Track swarm usage
        if hasattr(self.swarm, 'last_usage'):
            state.usage.add(
                self.swarm.last_usage.get("input_tokens", 0),
                self.swarm.last_usage.get("output_tokens", 0),
            )

        # Filter to worth checking
        worth_checking = self.swarm.filter_worth_checking(evaluations)

        # 3. Check availability
        domains_to_check = [e.domain for e in worth_checking]
        availability_results = await self._check_availability(domains_to_check)

        # 4. Get pricing for available domains
        available_domains = [
            r.domain for r in availability_results
            if r.status == "AVAILABLE"
        ]
        pricing = {}
        if available_domains:
            try:
                pricing = await get_batch_pricing(available_domains)
            except Exception:
                pass  # Pricing is optional

        # 5. Build results
        eval_map = {e.domain.lower(): e for e in evaluations}
        new_good_count = 0

        for result in availability_results:
            domain = result.domain
            evaluation = eval_map.get(domain.lower())
            price_info = pricing.get(domain)

            search_result = DomainSearchResult(
                domain=domain,
                tld=domain.split(".")[-1],
                status="available" if result.status == "AVAILABLE" else (
                    "registered" if result.status == "REGISTERED" else "unknown"
                ),
                score=evaluation.score if evaluation else 0.5,
                price_cents=price_info.price_cents if price_info else None,
                price_category=price_info.category if price_info else "unknown",
                evaluation=evaluation,
                batch_num=state.batch_num,
            )

            state.all_results.append(search_result)
            state.checked_domains.append(domain)

            if search_result.status == "available":
                state.available_domains.append(domain)
                if search_result.is_good:
                    new_good_count += 1

        duration = time.time() - start_time

        return BatchResult(
            batch_num=state.batch_num,
            candidates_generated=len(candidates),
            candidates_evaluated=len(evaluations),
            domains_checked=len(availability_results),
            domains_available=len(available_domains),
            new_good_results=new_good_count,
            duration_seconds=duration,
        )

    async def _check_availability(
        self,
        domains: list[str],
    ) -> list[DomainResult]:
        """
        Check availability of domains via RDAP.

        Args:
            domains: Domains to check

        Returns:
            List of DomainResult objects
        """
        results = []
        delay = config.rate_limit.rdap_delay_seconds

        for domain in domains:
            result = check_domain(domain)
            results.append(result)

            # Rate limit
            if delay > 0:
                await asyncio.sleep(delay)

        return results

    async def generate_followup_quiz(
        self,
        state: SearchState,
    ) -> FollowupQuiz:
        """
        Generate a follow-up quiz for a search that needs more input.

        Args:
            state: Search state with results

        Returns:
            FollowupQuiz with targeted questions
        """
        if not state.quiz:
            raise ValueError("No quiz data in search state")

        return await self.followup_generator.generate(
            original_quiz=state.quiz.to_dict(),
            batches_completed=state.batch_num,
            total_checked=len(state.checked_domains),
            good_found=state.good_count,
            target=config.search.target_good_results,
            checked_domains=state.checked_domains,
            available_domains=state.available_domains,
        )

    def get_ranked_results(
        self,
        state: SearchState,
        limit: int = 25,
    ) -> list[DomainSearchResult]:
        """
        Get ranked results from a search.

        Sorts by:
        1. Available first
        2. Score (higher is better)
        3. Price category (bundled > recommended > standard > premium)

        Args:
            state: Search state with results
            limit: Maximum results to return

        Returns:
            Sorted list of top results
        """
        # Filter to available
        available = [r for r in state.all_results if r.status == "available"]

        # Sort by score descending, then by price category
        category_order = {"bundled": 0, "recommended": 1, "standard": 2, "premium": 3, "unknown": 4}

        sorted_results = sorted(
            available,
            key=lambda r: (-r.score, category_order.get(r.price_category, 5)),
        )

        return sorted_results[:limit]

    def format_results_terminal(
        self,
        state: SearchState,
        limit: int = 25,
    ) -> str:
        """
        Format results for terminal display with box-drawing characters.

        Args:
            state: Search state with results
            limit: Maximum results to show

        Returns:
            Formatted string for terminal display
        """
        results = self.get_ranked_results(state, limit)

        if not results:
            return """
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  NO DOMAINS FOUND                                            │
│  ════════════════                                            │
│                                                              │
│  We couldn't find any available domains matching your        │
│  criteria. Consider expanding your TLD preferences or        │
│  trying different name variations.                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
"""

        # Group by category
        bundled = [r for r in results if r.price_category == "bundled"]
        recommended = [r for r in results if r.price_category == "recommended"]
        standard = [r for r in results if r.price_category == "standard"]
        premium = [r for r in results if r.price_category == "premium"]
        unknown = [r for r in results if r.price_category == "unknown"]

        lines = [
            "┌──────────────────────────────────────────────────────────────┐",
            "│                                                              │",
            f"│  DOMAIN OPTIONS FOR {state.quiz.business_name.upper()[:35]:<35} │",
            "│  ════════════════════════════════════════════════════════    │",
            "│                                                              │",
        ]

        if bundled:
            lines.extend([
                "│  ★ TOP RECOMMENDATIONS (bundled, no extra cost)              │",
                "│                                                              │",
            ])
            for r in bundled[:5]:
                price = f"${r.price_dollars:.0f}/yr" if r.price_cents else "N/A"
                lines.append(f"│    {r.domain:<30} {price:>10}             │")
            lines.append("│                                                              │")

        if recommended:
            lines.extend([
                "│  ◆ RECOMMENDED                                               │",
                "│                                                              │",
            ])
            for r in recommended[:5]:
                price = f"${r.price_dollars:.0f}/yr" if r.price_cents else "N/A"
                lines.append(f"│    {r.domain:<30} {price:>10}             │")
            lines.append("│                                                              │")

        if premium:
            lines.extend([
                "│  💎 PREMIUM                                                   │",
                "│                                                              │",
            ])
            for r in premium[:3]:
                price = f"${r.price_dollars:.0f}/yr" if r.price_cents else "N/A"
                lines.append(f"│    {r.domain:<30} {price:>10}             │")
            lines.append("│                                                              │")

        if unknown:
            lines.extend([
                "│  🔍 AVAILABLE (pricing pending)                              │",
                "│                                                              │",
            ])
            for r in unknown[:10]:
                lines.append(f"│    {r.domain:<30} {'—':>10}             │")
            lines.append("│                                                              │")

        lines.extend([
            "│  ─────────────────────────────────────────────────────────   │",
            f"│  Found {len(results)} available domains • {state.batch_num} batch(es) completed       │",
            "│                                                              │",
            "└──────────────────────────────────────────────────────────────┘",
        ])

        return "\n".join(lines)


# Convenience function for quick searches
async def quick_search(
    business_name: str,
    vibe: str = "professional",
    tld_preferences: Optional[list[str]] = None,
    keywords: Optional[str] = None,
    max_batches: int = 2,
    use_mock: bool = True,
) -> SearchState:
    """
    Run a quick domain search with minimal setup.

    Args:
        business_name: Business or project name
        vibe: Brand vibe
        tld_preferences: Preferred TLDs
        keywords: Optional keywords
        max_batches: Number of batches to run
        use_mock: Use mock providers (True for testing)

    Returns:
        SearchState with results
    """
    import uuid

    quiz = InitialQuiz(
        business_name=business_name,
        tld_preferences=tld_preferences or ["com", "co", "io"],
        vibe=vibe,
        keywords=keywords,
    )

    state = SearchState(
        job_id=str(uuid.uuid4()),
        client_id="quick-search",
        quiz=quiz,
    )

    orchestrator = DomainSearchOrchestrator(use_mock=use_mock)
    return await orchestrator.run_search(state, max_batches=max_batches)
