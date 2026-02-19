"""
Tests for AI agents (driver and swarm).
"""

import pytest
import json

from forage.agents.driver import DriverAgent, DomainCandidate, PreviousResults
from forage.agents.swarm import SwarmAgent, DomainEvaluation
from forage.providers.mock import MockProvider


class TestDomainCandidate:
    """Tests for DomainCandidate dataclass."""

    def test_basic_creation(self):
        """Test basic candidate creation."""
        candidate = DomainCandidate(domain="test.com", batch_num=1)

        assert candidate.domain == "test.com"
        assert candidate.tld == "com"
        assert candidate.batch_num == 1
        assert candidate.name == "test"

    def test_tld_extraction(self):
        """Test TLD extraction from various domains."""
        cases = [
            ("example.com", "com"),
            ("test.io", "io"),
            ("my.domain.co.uk", "uk"),
            ("simple.dev", "dev"),
        ]

        for domain, expected_tld in cases:
            candidate = DomainCandidate(domain=domain, batch_num=1)
            assert candidate.tld == expected_tld

    def test_equality(self):
        """Test equality comparison."""
        c1 = DomainCandidate(domain="test.com", batch_num=1)
        c2 = DomainCandidate(domain="TEST.COM", batch_num=2)
        c3 = DomainCandidate(domain="other.com", batch_num=1)

        assert c1 == c2  # Case insensitive
        assert c1 != c3
        assert c1 == "test.com"  # Can compare with string

    def test_hash(self):
        """Test hashing for set usage."""
        c1 = DomainCandidate(domain="test.com", batch_num=1)
        c2 = DomainCandidate(domain="TEST.COM", batch_num=2)

        # Should have same hash (case insensitive)
        assert hash(c1) == hash(c2)

        # Can be used in sets
        domain_set = {c1, c2}
        assert len(domain_set) == 1


class TestPreviousResults:
    """Tests for PreviousResults context."""

    def test_empty_results(self):
        """Test with no previous results."""
        prev = PreviousResults()

        assert prev.checked_count == 0
        assert prev.available_count == 0
        assert "Nothing checked" in prev.get_tried_summary()

    def test_with_results(self):
        """Test with actual results."""
        prev = PreviousResults(
            checked_domains=["a.com", "b.com", "c.io", "d.io"],
            available_domains=["a.com", "c.io"],
            target_count=25,
        )

        assert prev.checked_count == 4
        assert prev.available_count == 2
        assert ".com" in prev.get_tried_summary()
        assert "a.com" in prev.get_available_summary()

    def test_to_context_dict(self):
        """Test conversion to context dict."""
        prev = PreviousResults(
            checked_domains=["a.com"],
            available_domains=["a.com"],
        )

        context = prev.to_context_dict()
        assert "checked_count" in context
        assert "available_count" in context
        assert context["checked_count"] == 1


class TestDriverAgent:
    """Tests for DriverAgent."""

    @pytest.mark.asyncio
    async def test_generate_candidates(self):
        """Test basic candidate generation."""
        provider = MockProvider()
        driver = DriverAgent(provider)

        candidates = await driver.generate_candidates(
            business_name="TestBusiness",
            tld_preferences=["com", "io"],
            vibe="professional",
            batch_num=1,
            count=10,
        )

        assert len(candidates) <= 10
        for c in candidates:
            assert isinstance(c, DomainCandidate)
            assert "." in c.domain

    @pytest.mark.asyncio
    async def test_filters_previous_domains(self):
        """Test that previously checked domains are filtered."""
        provider = MockProvider()
        driver = DriverAgent(provider)

        # First batch
        candidates1 = await driver.generate_candidates(
            business_name="Test",
            tld_preferences=["com"],
            vibe="professional",
            batch_num=1,
            count=20,
        )

        # Second batch with previous results
        prev = PreviousResults(
            checked_domains=[c.domain for c in candidates1],
        )

        candidates2 = await driver.generate_candidates(
            business_name="Test",
            tld_preferences=["com"],
            vibe="professional",
            batch_num=2,
            count=20,
            previous_results=prev,
        )

        # No overlap should exist
        domains1 = {c.domain.lower() for c in candidates1}
        for c in candidates2:
            assert c.domain.lower() not in domains1

    def test_is_valid_domain(self):
        """Test domain validation."""
        driver = DriverAgent(MockProvider())

        valid = [
            "test.com",
            "my-domain.io",
            "a.co",
            "example123.dev",
        ]

        invalid = [
            "no-tld",
            ".com",  # No name
            "-start.com",  # Starts with hyphen
            "end-.com",  # Ends with hyphen
            "too" * 30 + ".com",  # Too long
            "has spaces.com",  # Spaces
        ]

        for domain in valid:
            assert driver._is_valid_domain(domain), f"{domain} should be valid"

        for domain in invalid:
            assert not driver._is_valid_domain(domain), f"{domain} should be invalid"


class TestDomainEvaluation:
    """Tests for DomainEvaluation dataclass."""

    def test_from_dict(self):
        """Test creation from dict."""
        data = {
            "domain": "test.com",
            "score": 0.85,
            "worth_checking": True,
            "pronounceable": True,
            "memorable": True,
            "brand_fit": True,
            "email_friendly": True,
            "flags": ["good"],
            "notes": "Nice domain",
        }

        evaluation = DomainEvaluation.from_dict(data)

        assert evaluation.domain == "test.com"
        assert evaluation.score == 0.85
        assert evaluation.worth_checking is True

    def test_quick_evaluate(self):
        """Test heuristic evaluation."""
        good = DomainEvaluation.quick_evaluate("test.com")
        bad = DomainEvaluation.quick_evaluate("verylongdomainname123.xyz")

        assert good.score > bad.score
        assert good.pronounceable is True
        assert "numbers" in str(bad.flags)

    def test_quick_evaluate_hyphens(self):
        """Test that hyphens are flagged."""
        result = DomainEvaluation.quick_evaluate("my-domain.com")

        assert "hyphens" in str(result.flags)
        assert not result.email_friendly


class TestSwarmAgent:
    """Tests for SwarmAgent."""

    @pytest.mark.asyncio
    async def test_evaluate_domains(self):
        """Test domain evaluation."""
        provider = MockProvider()
        swarm = SwarmAgent(provider, chunk_size=5)

        domains = ["test.com", "example.io", "myapp.dev"]
        evaluations = await swarm.evaluate(
            domains=domains,
            vibe="professional",
            business_name="Test",
        )

        # Should have at least as many evaluations as requested domains
        # (mock may add extras from parsing prompt)
        assert len(evaluations) >= len(domains)
        # All requested domains should be evaluated
        eval_domains = {e.domain.lower() for e in evaluations}
        for d in domains:
            assert d.lower() in eval_domains
        for e in evaluations:
            assert isinstance(e, DomainEvaluation)
            assert 0 <= e.score <= 1

    @pytest.mark.asyncio
    async def test_empty_domains(self):
        """Test with empty domain list."""
        swarm = SwarmAgent(MockProvider())
        evaluations = await swarm.evaluate(
            domains=[],
            vibe="professional",
            business_name="Test",
        )

        assert evaluations == []

    @pytest.mark.asyncio
    async def test_chunking(self):
        """Test that large domain lists are chunked."""
        provider = MockProvider()
        swarm = SwarmAgent(provider, chunk_size=5, max_concurrent=2)

        # More domains than chunk size
        domains = [f"domain{i}.com" for i in range(15)]
        evaluations = await swarm.evaluate(
            domains=domains,
            vibe="professional",
            business_name="Test",
        )

        # Should have at least as many evaluations as requested
        assert len(evaluations) >= 15
        # All requested domains should be in the results
        eval_domains = {e.domain.lower() for e in evaluations}
        for d in domains:
            assert d.lower() in eval_domains

    def test_filter_worth_checking(self):
        """Test filtering evaluations."""
        swarm = SwarmAgent(MockProvider())

        evaluations = [
            DomainEvaluation(domain="good.com", score=0.8, worth_checking=True),
            DomainEvaluation(domain="bad.com", score=0.2, worth_checking=False),
            DomainEvaluation(domain="maybe.com", score=0.5, worth_checking=True),
        ]

        filtered = swarm.filter_worth_checking(evaluations, min_score=0.4)

        assert len(filtered) == 2
        assert "bad.com" not in [e.domain for e in filtered]

    def test_rank_evaluations(self):
        """Test ranking by score."""
        swarm = SwarmAgent(MockProvider())

        evaluations = [
            DomainEvaluation(domain="low.com", score=0.3, worth_checking=True),
            DomainEvaluation(domain="high.com", score=0.9, worth_checking=True),
            DomainEvaluation(domain="mid.com", score=0.6, worth_checking=True),
        ]

        ranked = swarm.rank_evaluations(evaluations)

        assert ranked[0].domain == "high.com"
        assert ranked[1].domain == "mid.com"
        assert ranked[2].domain == "low.com"
