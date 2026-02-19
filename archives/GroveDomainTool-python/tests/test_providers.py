"""
Tests for AI model providers.
"""

import pytest
import json

from forage.providers.base import ModelProvider, ModelResponse, ProviderError
from forage.providers.mock import (
    MockProvider,
    generate_mock_domains,
    generate_mock_evaluation,
    create_domain_generator_mock,
    create_evaluator_mock,
)


class TestMockProvider:
    """Tests for MockProvider."""

    @pytest.mark.asyncio
    async def test_basic_generate(self):
        """Test basic response generation."""
        provider = MockProvider(fixed_response="Hello, world!")
        response = await provider.generate("Test prompt")

        assert response.content == "Hello, world!"
        assert response.provider == "mock"
        assert response.model == "mock-model-v1"

    @pytest.mark.asyncio
    async def test_custom_response_generator(self):
        """Test custom response generator."""
        def my_generator(prompt: str) -> str:
            return f"Response to: {prompt}"

        provider = MockProvider(response_generator=my_generator)
        response = await provider.generate("Hello")

        assert response.content == "Response to: Hello"

    @pytest.mark.asyncio
    async def test_domain_detection(self):
        """Test automatic domain generation detection."""
        provider = MockProvider()
        response = await provider.generate(
            'Generate domain suggestions for business "Test Co"'
        )

        # Should return JSON with domains
        data = json.loads(response.content)
        assert "domains" in data
        assert len(data["domains"]) > 0

    @pytest.mark.asyncio
    async def test_evaluation_detection(self):
        """Test automatic evaluation detection."""
        provider = MockProvider()
        response = await provider.generate(
            "Evaluate these domains: test.com, example.io"
        )

        # Should return JSON with evaluations
        data = json.loads(response.content)
        assert "evaluations" in data

    @pytest.mark.asyncio
    async def test_batch_generate(self):
        """Test batch generation."""
        provider = MockProvider(fixed_response="Batch response")
        prompts = ["Prompt 1", "Prompt 2", "Prompt 3"]
        responses = await provider.generate_batch(prompts)

        assert len(responses) == 3
        for r in responses:
            assert r.content == "Batch response"

    @pytest.mark.asyncio
    async def test_simulated_failure(self):
        """Test simulated failures."""
        provider = MockProvider(fail_rate=1.0)  # Always fail

        with pytest.raises(ProviderError):
            await provider.generate("Test")

    @pytest.mark.asyncio
    async def test_usage_tracking(self):
        """Test token usage tracking."""
        provider = MockProvider(token_count=150)
        response = await provider.generate("Some test prompt here")

        assert response.output_tokens == 150
        assert response.input_tokens > 0
        assert response.total_tokens > 150


class TestMockDomainGeneration:
    """Tests for mock domain generation helpers."""

    def test_generate_mock_domains(self):
        """Test mock domain generation."""
        domains = generate_mock_domains("TestBusiness", count=20)

        assert len(domains) <= 20
        for domain in domains:
            assert "." in domain
            assert len(domain) > 3

    def test_generate_mock_domains_variations(self):
        """Test that variations are generated."""
        domains = generate_mock_domains("MyApp")

        # Should have some direct names and variations
        direct = [d for d in domains if d.startswith("myapp")]
        variations = [d for d in domains if not d.startswith("myapp")]

        assert len(direct) > 0
        assert len(variations) > 0

    def test_generate_mock_evaluation(self):
        """Test mock evaluation generation."""
        evaluation = generate_mock_evaluation("test.com")

        assert evaluation["domain"] == "test.com"
        assert 0 <= evaluation["score"] <= 1
        assert isinstance(evaluation["worth_checking"], bool)
        assert isinstance(evaluation["pronounceable"], bool)

    def test_evaluation_scoring_logic(self):
        """Test evaluation scoring is reasonable."""
        short_com = generate_mock_evaluation("test.com")
        long_weird = generate_mock_evaluation("verylongdomainname.xyz")

        # Short .com should score higher
        assert short_com["score"] > long_weird["score"]


class TestDomainGeneratorMock:
    """Tests for pre-configured mock providers."""

    @pytest.mark.asyncio
    async def test_domain_generator_mock(self):
        """Test domain generator mock provider."""
        provider = create_domain_generator_mock("MyBusiness")
        response = await provider.generate("Generate domains")

        data = json.loads(response.content)
        assert "domains" in data
        assert len(data["domains"]) > 0

    @pytest.mark.asyncio
    async def test_evaluator_mock(self):
        """Test evaluator mock provider."""
        provider = create_evaluator_mock()
        response = await provider.generate("Evaluate: test.com, example.io")

        data = json.loads(response.content)
        assert "evaluations" in data


class TestModelResponse:
    """Tests for ModelResponse dataclass."""

    def test_token_properties(self):
        """Test token count properties."""
        response = ModelResponse(
            content="Test",
            model="test-model",
            provider="test",
            usage={"input_tokens": 100, "output_tokens": 50},
        )

        assert response.input_tokens == 100
        assert response.output_tokens == 50
        assert response.total_tokens == 150

    def test_empty_usage(self):
        """Test with no usage data."""
        response = ModelResponse(
            content="Test",
            model="test-model",
            provider="test",
        )

        assert response.input_tokens == 0
        assert response.output_tokens == 0
        assert response.total_tokens == 0
