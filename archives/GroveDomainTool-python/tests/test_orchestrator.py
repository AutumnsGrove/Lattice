"""
Tests for the domain search orchestrator.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock

from forage.orchestrator import (
    DomainSearchOrchestrator,
    SearchState,
    SearchStatus,
    DomainSearchResult,
    quick_search,
)
from forage.quiz.schema import InitialQuiz
from forage.providers.mock import MockProvider
from forage.checker import DomainResult


def mock_check_domain(domain: str) -> DomainResult:
    """Mock domain checker that returns alternating available/registered."""
    # Simple deterministic logic for testing
    if hash(domain) % 2 == 0:
        return DomainResult(domain=domain, status="AVAILABLE")
    else:
        return DomainResult(domain=domain, status="REGISTERED", registrar="MockRegistrar")


class TestSearchState:
    """Tests for SearchState."""

    def test_initial_state(self):
        """Test initial state creation."""
        state = SearchState(
            job_id="test-123",
            client_id="client-456",
        )

        assert state.status == SearchStatus.PENDING
        assert state.batch_num == 0
        assert state.good_count == 0

    def test_good_results_filtering(self):
        """Test good results are filtered correctly."""
        state = SearchState(
            job_id="test",
            client_id="test",
            all_results=[
                DomainSearchResult(domain="a.com", tld="com", status="available", score=0.8),
                DomainSearchResult(domain="b.com", tld="com", status="registered", score=0.9),
                DomainSearchResult(domain="c.com", tld="com", status="available", score=0.3),
                DomainSearchResult(domain="d.com", tld="com", status="available", score=0.6),
            ],
        )

        good = state.good_results

        # Only available with score >= 0.4
        assert len(good) == 2
        assert all(r.status == "available" for r in good)
        assert all(r.score >= 0.4 for r in good)

    def test_to_dict(self):
        """Test serialization to dict."""
        quiz = InitialQuiz(business_name="Test", vibe="professional")
        state = SearchState(
            job_id="test",
            client_id="client",
            quiz=quiz,
            batch_num=2,
        )

        data = state.to_dict()

        assert data["job_id"] == "test"
        assert data["batch_num"] == 2
        assert data["quiz"]["business_name"] == "Test"


class TestDomainSearchResult:
    """Tests for DomainSearchResult."""

    def test_is_good(self):
        """Test is_good property."""
        good = DomainSearchResult(domain="a.com", tld="com", status="available", score=0.8)
        bad_score = DomainSearchResult(domain="b.com", tld="com", status="available", score=0.2)
        registered = DomainSearchResult(domain="c.com", tld="com", status="registered", score=0.9)

        assert good.is_good is True
        assert bad_score.is_good is False
        assert registered.is_good is False

    def test_price_dollars(self):
        """Test price conversion."""
        result = DomainSearchResult(
            domain="test.com",
            tld="com",
            status="available",
            price_cents=1500,
        )

        assert result.price_dollars == 15.0

    def test_to_dict(self):
        """Test serialization."""
        result = DomainSearchResult(
            domain="test.com",
            tld="com",
            status="available",
            score=0.75,
            batch_num=1,
        )

        data = result.to_dict()

        assert data["domain"] == "test.com"
        assert data["score"] == 0.75


class TestDomainSearchOrchestrator:
    """Tests for DomainSearchOrchestrator."""

    @pytest.fixture
    def orchestrator(self):
        """Create orchestrator with mock providers."""
        return DomainSearchOrchestrator(use_mock=True)

    @pytest.fixture
    def initial_state(self):
        """Create initial search state."""
        quiz = InitialQuiz(
            business_name="TestCo",
            tld_preferences=["com", "io"],
            vibe="professional",
        )
        return SearchState(
            job_id="test-job",
            client_id="test-client",
            quiz=quiz,
        )

    @pytest.mark.asyncio
    @patch('forage.orchestrator.check_domain', side_effect=mock_check_domain)
    @patch('forage.orchestrator.config.rate_limit.rdap_delay_seconds', 0)
    async def test_run_single_batch(self, mock_checker, orchestrator, initial_state):
        """Test running a single batch."""
        # Simulate what run_search does - set batch_num before running
        initial_state.batch_num = 1
        batch_result = await orchestrator.run_batch(initial_state)

        assert batch_result.batch_num == 1
        assert batch_result.candidates_generated > 0
        assert batch_result.duration_seconds >= 0
        assert initial_state.batch_num == 1

    @pytest.mark.asyncio
    @patch('forage.orchestrator.check_domain', side_effect=mock_check_domain)
    @patch('forage.orchestrator.config.rate_limit.rdap_delay_seconds', 0)
    async def test_run_search_completes(self, mock_checker, orchestrator):
        """Test full search runs to completion."""
        quiz = InitialQuiz(
            business_name="QuickTest",
            tld_preferences=["com"],
            vibe="creative",
        )
        state = SearchState(
            job_id="test",
            client_id="test",
            quiz=quiz,
        )

        result = await orchestrator.run_search(state, max_batches=2)

        assert result.status in [SearchStatus.COMPLETE, SearchStatus.NEEDS_FOLLOWUP]
        assert result.batch_num <= 2
        assert len(result.checked_domains) > 0

    @pytest.mark.asyncio
    async def test_no_quiz_raises_error(self, orchestrator):
        """Test that missing quiz raises error."""
        state = SearchState(job_id="test", client_id="test")

        with pytest.raises(ValueError, match="quiz"):
            await orchestrator.run_batch(state)

    @pytest.mark.asyncio
    @patch('forage.orchestrator.check_domain', side_effect=mock_check_domain)
    @patch('forage.orchestrator.config.rate_limit.rdap_delay_seconds', 0)
    async def test_followup_quiz_generation(self, mock_checker, orchestrator, initial_state):
        """Test follow-up quiz generation."""
        # Run a batch first
        await orchestrator.run_batch(initial_state)

        # Generate follow-up
        followup = await orchestrator.generate_followup_quiz(initial_state)

        assert len(followup.questions) > 0
        assert followup.context is not None

    def test_get_ranked_results(self, orchestrator):
        """Test result ranking."""
        state = SearchState(
            job_id="test",
            client_id="test",
            all_results=[
                DomainSearchResult(domain="low.com", tld="com", status="available", score=0.3, price_category="bundled"),
                DomainSearchResult(domain="high.com", tld="com", status="available", score=0.9, price_category="premium"),
                DomainSearchResult(domain="mid.com", tld="com", status="available", score=0.6, price_category="bundled"),
                DomainSearchResult(domain="taken.com", tld="com", status="registered", score=1.0, price_category="bundled"),
            ],
        )

        ranked = orchestrator.get_ranked_results(state, limit=10)

        assert len(ranked) == 3  # Only available
        assert ranked[0].domain == "high.com"  # Highest score first

    def test_format_results_terminal(self, orchestrator):
        """Test terminal formatting."""
        quiz = InitialQuiz(business_name="Test", vibe="professional")
        state = SearchState(
            job_id="test",
            client_id="test",
            quiz=quiz,
            batch_num=1,
            all_results=[
                DomainSearchResult(
                    domain="test.com",
                    tld="com",
                    status="available",
                    score=0.8,
                    price_cents=1500,
                    price_category="bundled",
                ),
            ],
        )

        output = orchestrator.format_results_terminal(state)

        assert "DOMAIN OPTIONS" in output
        assert "test.com" in output
        assert "bundled" in output.lower() or "TOP" in output

    def test_format_empty_results(self, orchestrator):
        """Test formatting with no results."""
        quiz = InitialQuiz(business_name="Test", vibe="professional")
        state = SearchState(
            job_id="test",
            client_id="test",
            quiz=quiz,
        )

        output = orchestrator.format_results_terminal(state)

        assert "NO DOMAINS FOUND" in output


class TestQuickSearch:
    """Tests for quick_search convenience function."""

    @pytest.mark.asyncio
    @patch('forage.orchestrator.check_domain', side_effect=mock_check_domain)
    @patch('forage.orchestrator.config.rate_limit.rdap_delay_seconds', 0)
    async def test_quick_search(self, mock_checker):
        """Test quick search with defaults."""
        result = await quick_search(
            business_name="QuickTest",
            max_batches=1,
            use_mock=True,
        )

        assert result.job_id is not None
        assert result.status in [SearchStatus.COMPLETE, SearchStatus.NEEDS_FOLLOWUP, SearchStatus.RUNNING]
        assert result.quiz.business_name == "QuickTest"

    @pytest.mark.asyncio
    @patch('forage.orchestrator.check_domain', side_effect=mock_check_domain)
    @patch('forage.orchestrator.config.rate_limit.rdap_delay_seconds', 0)
    async def test_quick_search_with_options(self, mock_checker):
        """Test quick search with custom options."""
        result = await quick_search(
            business_name="MyBiz",
            vibe="creative",
            tld_preferences=["io", "dev"],
            keywords="tech, startup",
            max_batches=1,
            use_mock=True,
        )

        assert result.quiz.vibe == "creative"
        assert result.quiz.keywords == "tech, startup"
