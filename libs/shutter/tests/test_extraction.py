"""
Tests for full extraction (Phase 2).
"""

import pytest

from grove_shutter import extraction


class TestGetModelForTier:
    """Test suite for model tier mapping."""

    def test_fast_tier(self):
        """Test fast tier maps to Cerebras-hosted GPT-OSS model."""
        model = extraction.get_model_for_tier("fast")
        assert model == "openai/gpt-oss-120b"

    def test_accurate_tier(self):
        """Test accurate tier maps to DeepSeek v3.2 model."""
        model = extraction.get_model_for_tier("accurate")
        assert model == "deepseek/deepseek-v3.2"

    def test_research_tier(self):
        """Test research tier maps to Tongyi DeepResearch model."""
        model = extraction.get_model_for_tier("research")
        assert model == "alibaba/tongyi-deepresearch-30b-a3b"

    def test_code_tier(self):
        """Test code tier maps to MiniMax m2.1 model."""
        model = extraction.get_model_for_tier("code")
        assert model == "minimax/minimax-m2.1"

    def test_unknown_tier_defaults_to_fast(self):
        """Test that unknown tier falls back to fast."""
        model = extraction.get_model_for_tier("unknown")
        assert model == "openai/gpt-oss-120b"

    def test_case_insensitive(self):
        """Test that tier names are case-insensitive."""
        assert extraction.get_model_for_tier("FAST") == "openai/gpt-oss-120b"
        assert extraction.get_model_for_tier("Accurate") == "deepseek/deepseek-v3.2"
        assert extraction.get_model_for_tier("RESEARCH") == "alibaba/tongyi-deepresearch-30b-a3b"


class TestBuildExtractionPrompt:
    """Test suite for prompt construction."""

    def test_basic_prompt_structure(self):
        """Test that prompt has correct basic structure."""
        prompt = extraction.build_extraction_prompt(
            content="Test content here",
            query="What is this about?"
        )

        assert "Web page content:" in prompt
        assert "---" in prompt
        assert "Test content here" in prompt
        assert "What is this about?" in prompt
        assert "Respond concisely based only on the content above" in prompt

    def test_prompt_contains_content_delimiter(self):
        """Test that content is properly delimited."""
        prompt = extraction.build_extraction_prompt(
            content="My test content",
            query="Test query"
        )

        # Content should be between --- delimiters
        lines = prompt.split("\n")
        delimiter_count = sum(1 for line in lines if line.strip() == "---")
        assert delimiter_count >= 2

    def test_extended_query_included(self):
        """Test that extended_query is included when provided."""
        prompt = extraction.build_extraction_prompt(
            content="Test content",
            query="Main query",
            extended_query="Additional instructions here"
        )

        assert "Additional extraction guidance:" in prompt
        assert "Additional instructions here" in prompt

    def test_extended_query_omitted_when_none(self):
        """Test that extended_query section is omitted when not provided."""
        prompt = extraction.build_extraction_prompt(
            content="Test content",
            query="Main query",
            extended_query=None
        )

        assert "Additional extraction guidance:" not in prompt

    def test_grounding_instruction_present(self):
        """Test that grounding instruction is always present."""
        prompt = extraction.build_extraction_prompt(
            content="Content",
            query="Query"
        )

        assert 'If the requested information is not present, say "Not found in page content."' in prompt


class TestExtractContent:
    """Test suite for extract_content() function."""

    @pytest.mark.asyncio
    async def test_dry_run_mode(self, monkeypatch):
        """Test that dry-run mode returns mock response."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "1")

        extracted, tokens_in, tokens_out, model_used = await extraction.extract_content(
            content="Test content",
            query="Test query",
            model="fast",
            max_tokens=500
        )

        assert "[DRY RUN]" in extracted
        assert tokens_in == 1000  # Mock value
        assert tokens_out == 50  # Mock value
        assert model_used == "openai/gpt-oss-120b"

    @pytest.mark.asyncio
    async def test_dry_run_uses_correct_model_tier(self, monkeypatch):
        """Test that dry-run respects model tier."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "1")

        _, _, _, model_used = await extraction.extract_content(
            content="Test",
            query="Test",
            model="accurate"
        )
        assert model_used == "deepseek/deepseek-v3.2"

        _, _, _, model_used = await extraction.extract_content(
            content="Test",
            query="Test",
            model="code"
        )
        assert model_used == "minimax/minimax-m2.1"

    @pytest.mark.asyncio
    async def test_raises_without_api_key(self, monkeypatch, tmp_path):
        """Test that extraction raises ValueError without API key."""
        # Disable dry-run
        monkeypatch.delenv("SHUTTER_DRY_RUN", raising=False)
        # Remove API key
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

        # Point config to empty paths
        from grove_shutter import config
        monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.toml")
        monkeypatch.setattr(config, "SECRETS_PATH", tmp_path / "secrets.json")

        with pytest.raises(ValueError) as exc_info:
            await extraction.extract_content(
                content="Test",
                query="Test"
            )

        assert "OpenRouter API key not configured" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_returns_tuple_structure(self, monkeypatch):
        """Test that extract_content returns proper tuple structure."""
        monkeypatch.setenv("SHUTTER_DRY_RUN", "1")

        result = await extraction.extract_content(
            content="Test",
            query="Test",
            model="fast",
            max_tokens=500
        )

        assert isinstance(result, tuple)
        assert len(result) == 4
        assert isinstance(result[0], str)  # extracted
        assert isinstance(result[1], int)  # tokens_input
        assert isinstance(result[2], int)  # tokens_output
        assert isinstance(result[3], str)  # model_used


class TestMockResponse:
    """Test suite for mock response structure."""

    def test_mock_response_has_required_fields(self):
        """Test that MOCK_RESPONSE has all required fields."""
        assert "extracted" in extraction.MOCK_RESPONSE
        assert "tokens_input" in extraction.MOCK_RESPONSE
        assert "tokens_output" in extraction.MOCK_RESPONSE

    def test_mock_response_values_are_reasonable(self):
        """Test that mock values are reasonable for testing."""
        assert isinstance(extraction.MOCK_RESPONSE["extracted"], str)
        assert extraction.MOCK_RESPONSE["tokens_input"] > 0
        assert extraction.MOCK_RESPONSE["tokens_output"] > 0
