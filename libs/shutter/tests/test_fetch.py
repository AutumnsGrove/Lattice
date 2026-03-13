"""
Tests for grove_shutter.fetch module.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from grove_shutter import fetch
from grove_shutter.fetch import FetchError, extract_domain, html_to_text


class TestFetchError:
    """Test suite for FetchError exception."""

    def test_fetch_error_stores_url_and_reason(self):
        """Test that FetchError stores url and reason attributes."""
        error = FetchError("https://example.com", "Connection timeout")

        assert error.url == "https://example.com"
        assert error.reason == "Connection timeout"

    def test_fetch_error_message_format(self):
        """Test that FetchError formats message correctly."""
        error = FetchError("https://example.com", "HTTP 404")

        assert "https://example.com" in str(error)
        assert "HTTP 404" in str(error)
        assert "Failed to fetch" in str(error)


class TestExtractDomain:
    """Test suite for domain extraction edge cases."""

    def test_extract_domain_empty_string(self):
        """Test that empty string returns empty result."""
        # Empty string should not raise, just return empty
        result = extract_domain("")
        assert result == ""

    def test_extract_domain_bare_domain(self):
        """Test extraction from bare domain without protocol.

        urlparse treats bare domains as paths (not netloc), so
        extract_domain returns empty string for schemeless input.
        """
        result = extract_domain("example.com")
        # Without a scheme, urlparse puts everything in `path`, not `netloc`
        assert result == ""

    def test_extract_domain_bare_domain_with_path(self):
        """Test bare domain with path."""
        result = extract_domain("example.com/path/to/page")
        # urlparse treats this as path, not domain
        # When no scheme, netloc is empty, path is "example.com/path/to/page"
        # This is an edge case - the function expects full URLs with scheme
        assert result == ""

    def test_extract_domain_international_domain(self):
        """Test extraction preserves international domains."""
        result = extract_domain("https://example.例え.jp")
        assert result == "example.例え.jp"

    def test_extract_domain_multiple_subdomains(self):
        """Test extraction preserves multiple subdomains."""
        result = extract_domain("https://api.v2.staging.example.com")
        assert result == "api.v2.staging.example.com"

    def test_extract_domain_www_stripped_only(self):
        """Test that only www. is stripped, not other w-subdomains."""
        assert extract_domain("https://www.example.com") == "example.com"
        assert extract_domain("https://wa.example.com") == "wa.example.com"

    def test_extract_domain_localhost(self):
        """Test extraction from localhost."""
        result = extract_domain("http://localhost:8080")
        assert result == "localhost"


class TestHtmlToText:
    """Test suite for HTML to text conversion."""

    def test_html_to_text_empty_html(self):
        """Test that empty HTML returns None."""
        with patch("grove_shutter.fetch.trafilatura.extract", return_value=None):
            result = html_to_text("")
            assert result is None

    def test_html_to_text_with_content(self):
        """Test HTML extraction with actual content."""
        expected_text = "This is extracted article content."

        with patch("grove_shutter.fetch.trafilatura.extract", return_value=expected_text):
            result = html_to_text("<html><body>Some content</body></html>")
            assert result == expected_text

    def test_html_to_text_calls_trafilatura_correctly(self):
        """Test that html_to_text calls trafilatura with correct parameters."""
        mock_extract = patch("grove_shutter.fetch.trafilatura.extract", return_value="text")

        with mock_extract as mock:
            html_to_text("<html></html>")

            # Verify call with expected parameters
            mock.assert_called_once()
            call_kwargs = mock.call_args[1]
            assert call_kwargs["include_comments"] is False
            assert call_kwargs["include_tables"] is True
            assert call_kwargs["include_links"] is False
            assert call_kwargs["output_format"] == "txt"

    def test_html_to_text_whitespace_only(self):
        """Test that whitespace-only content returns None."""
        with patch("grove_shutter.fetch.trafilatura.extract", return_value=None):
            result = html_to_text("   \n\t\n   ")
            assert result is None


class TestFetchWithJina:
    """Test suite for fetch_with_jina function."""

    @pytest.mark.asyncio
    async def test_fetch_with_jina_success(self):
        """Test successful Jina fetch."""
        expected_content = "This is content from Jina Reader."

        mock_response = AsyncMock()
        mock_response.text = expected_content

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client):
            result = await fetch.fetch_with_jina("https://example.com")

            assert result == expected_content
            mock_client.get.assert_called_once()
            # Verify URL is prepended with r.jina.ai
            call_args = mock_client.get.call_args[0]
            assert "r.jina.ai" in call_args[0]

    @pytest.mark.asyncio
    async def test_fetch_with_jina_timeout(self):
        """Test that timeout is properly converted."""
        mock_response = AsyncMock()
        mock_response.text = "content"

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client) as mock_async_client:
            await fetch.fetch_with_jina("https://example.com", timeout=5000)

            # Verify timeout was converted from ms to seconds
            init_kwargs = mock_async_client.call_args[1]
            assert init_kwargs["timeout"] == 5.0

    @pytest.mark.asyncio
    async def test_fetch_with_jina_http_error(self):
        """Test that HTTP errors are raised."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.HTTPStatusError("404", request=MagicMock(), response=MagicMock()))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.HTTPStatusError):
                await fetch.fetch_with_jina("https://example.com")

    @pytest.mark.asyncio
    async def test_fetch_with_jina_connection_error(self):
        """Test that connection errors are raised."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.RequestError("Connection failed"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(httpx.RequestError):
                await fetch.fetch_with_jina("https://example.com")


class TestFetchWithTavily:
    """Test suite for fetch_with_tavily function."""

    @pytest.mark.asyncio
    async def test_fetch_with_tavily_success(self):
        """Test successful Tavily fetch."""
        expected_content = "Content from Tavily"

        mock_client = MagicMock()
        mock_client.extract = MagicMock(return_value={
            "results": [{"raw_content": expected_content}]
        })

        with patch("grove_shutter.fetch.get_api_key", return_value="test-key"):
            with patch("tavily.TavilyClient", return_value=mock_client):
                result = await fetch.fetch_with_tavily("https://example.com")

                assert result == expected_content
                mock_client.extract.assert_called_once_with(urls=["https://example.com"])

    @pytest.mark.asyncio
    async def test_fetch_with_tavily_no_api_key(self):
        """Test that missing API key raises ValueError."""
        with patch("grove_shutter.fetch.get_api_key", return_value=None):
            with pytest.raises(ValueError, match="No Tavily API key"):
                await fetch.fetch_with_tavily("https://example.com")

    @pytest.mark.asyncio
    async def test_fetch_with_tavily_empty_result(self):
        """Test that empty Tavily result raises ValueError."""
        mock_client = MagicMock()
        mock_client.extract = MagicMock(return_value={"results": []})

        with patch("grove_shutter.fetch.get_api_key", return_value="test-key"):
            with patch("tavily.TavilyClient", return_value=mock_client):
                with pytest.raises(ValueError, match="Tavily returned no content"):
                    await fetch.fetch_with_tavily("https://example.com")

    @pytest.mark.asyncio
    async def test_fetch_with_tavily_no_raw_content(self):
        """Test that missing raw_content in result raises ValueError."""
        mock_client = MagicMock()
        mock_client.extract = MagicMock(return_value={
            "results": [{"title": "Example"}]  # No raw_content
        })

        with patch("grove_shutter.fetch.get_api_key", return_value="test-key"):
            with patch("tavily.TavilyClient", return_value=mock_client):
                with pytest.raises(ValueError, match="Tavily returned no content"):
                    await fetch.fetch_with_tavily("https://example.com")


class TestFetchBasic:
    """Test suite for fetch_basic function."""

    @pytest.mark.asyncio
    async def test_fetch_basic_success(self):
        """Test successful basic fetch with trafilatura."""
        html_content = "<html><body>Test page content</body></html>"
        expected_text = "Test page content"

        mock_response = AsyncMock()
        mock_response.text = html_content

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client):
            with patch("grove_shutter.fetch.html_to_text", return_value=expected_text):
                result = await fetch.fetch_basic("https://example.com")

                assert result == expected_text

    @pytest.mark.asyncio
    async def test_fetch_basic_timeout(self):
        """Test that timeout raises FetchError."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("Timeout"))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(FetchError) as exc_info:
                await fetch.fetch_basic("https://example.com")

            assert exc_info.value.url == "https://example.com"
            assert "timed out" in exc_info.value.reason.lower()

    @pytest.mark.asyncio
    async def test_fetch_basic_http_error(self):
        """Test that HTTP status errors raise FetchError."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.HTTPStatusError("404", request=MagicMock(), response=mock_response))
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(FetchError) as exc_info:
                await fetch.fetch_basic("https://example.com")

            assert exc_info.value.url == "https://example.com"
            assert "404" in exc_info.value.reason

    @pytest.mark.asyncio
    async def test_fetch_basic_extraction_fails(self):
        """Test that extraction failure raises FetchError."""
        mock_response = AsyncMock()
        mock_response.text = "<html></html>"

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("grove_shutter.fetch.httpx.AsyncClient", return_value=mock_client):
            with patch("grove_shutter.fetch.html_to_text", return_value=None):
                with pytest.raises(FetchError) as exc_info:
                    await fetch.fetch_basic("https://example.com")

                assert "extract" in exc_info.value.reason.lower()


class TestFetchUrl:
    """Test suite for fetch_url fallback chain."""

    @pytest.mark.asyncio
    async def test_fetch_url_jina_success(self):
        """Test that fetch_url returns Jina content when successful."""
        expected_content = "Jina content" * 50  # Ensure > 100 chars

        mock_jina = AsyncMock(return_value=expected_content)

        with patch("grove_shutter.fetch.fetch_with_jina", mock_jina):
            with patch("grove_shutter.fetch.fetch_with_tavily"):
                with patch("grove_shutter.fetch.fetch_basic"):
                    result = await fetch.fetch_url("https://example.com")

                    assert result == expected_content

    @pytest.mark.asyncio
    async def test_fetch_url_jina_too_short_falls_back_to_tavily(self):
        """Test that Jina content < 100 chars triggers fallback."""
        short_content = "Too short"  # < 100 chars
        tavily_content = "Tavily content" * 50

        mock_jina = AsyncMock(return_value=short_content)
        mock_tavily = AsyncMock(return_value=tavily_content)

        with patch("grove_shutter.fetch.fetch_with_jina", mock_jina):
            with patch("grove_shutter.fetch.fetch_with_tavily", mock_tavily):
                with patch("grove_shutter.fetch.fetch_basic"):
                    result = await fetch.fetch_url("https://example.com")

                    assert result == tavily_content
                    mock_tavily.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_url_jina_fails_tries_tavily(self):
        """Test that Jina failure triggers Tavily fallback."""
        tavily_content = "Tavily content" * 50

        mock_jina = AsyncMock(side_effect=Exception("Jina failed"))
        mock_tavily = AsyncMock(return_value=tavily_content)

        with patch("grove_shutter.fetch.fetch_with_jina", mock_jina):
            with patch("grove_shutter.fetch.fetch_with_tavily", mock_tavily):
                with patch("grove_shutter.fetch.fetch_basic"):
                    result = await fetch.fetch_url("https://example.com")

                    assert result == tavily_content

    @pytest.mark.asyncio
    async def test_fetch_url_tavily_fails_tries_basic(self):
        """Test that Tavily failure triggers basic fetch fallback."""
        basic_content = "Basic content" * 50

        mock_jina = AsyncMock(side_effect=Exception("Jina failed"))
        mock_tavily = AsyncMock(side_effect=Exception("Tavily failed"))
        mock_basic = AsyncMock(return_value=basic_content)

        with patch("grove_shutter.fetch.fetch_with_jina", mock_jina):
            with patch("grove_shutter.fetch.fetch_with_tavily", mock_tavily):
                with patch("grove_shutter.fetch.fetch_basic", mock_basic):
                    result = await fetch.fetch_url("https://example.com")

                    assert result == basic_content

    @pytest.mark.asyncio
    async def test_fetch_url_all_methods_fail(self):
        """Test that FetchError is raised when all methods fail."""
        mock_jina = AsyncMock(side_effect=Exception("Jina failed"))
        mock_tavily = AsyncMock(side_effect=Exception("Tavily failed"))
        mock_basic = AsyncMock(side_effect=FetchError("https://example.com", "Basic failed"))

        with patch("grove_shutter.fetch.fetch_with_jina", mock_jina):
            with patch("grove_shutter.fetch.fetch_with_tavily", mock_tavily):
                with patch("grove_shutter.fetch.fetch_basic", mock_basic):
                    with pytest.raises(FetchError) as exc_info:
                        await fetch.fetch_url("https://example.com")

                    assert exc_info.value.url == "https://example.com"
                    assert "All fetch methods failed" in exc_info.value.reason

    @pytest.mark.asyncio
    async def test_fetch_url_custom_timeout(self):
        """Test that custom timeout is passed to fetch methods."""
        content = "Content" * 50

        mock_jina = AsyncMock(return_value=content)

        with patch("grove_shutter.fetch.fetch_with_jina", mock_jina):
            with patch("grove_shutter.fetch.fetch_with_tavily"):
                with patch("grove_shutter.fetch.fetch_basic"):
                    await fetch.fetch_url("https://example.com", timeout=15000)

                    # Verify timeout was passed to Jina (positional arg)
                    call_args = mock_jina.call_args
                    assert call_args[0][1] == 15000
