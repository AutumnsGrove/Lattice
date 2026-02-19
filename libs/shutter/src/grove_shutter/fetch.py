"""
HTTP fetching with Jina Reader, Tavily, and basic httpx fallback.

Fetch priority chain:
1. Jina Reader (free, renders JS)
2. Tavily (if API key available, renders JS)
3. Basic httpx + trafilatura (no JS rendering)
"""

import httpx
import trafilatura
from typing import Optional

from grove_shutter.config import get_api_key


class FetchError(Exception):
    """Raised when URL fetching fails."""

    def __init__(self, url: str, reason: str):
        self.url = url
        self.reason = reason
        super().__init__(f"Failed to fetch {url}: {reason}")


async def fetch_url(url: str, timeout: int = 30000) -> str:
    """
    Fetch URL content with smart fallback chain.

    Priority: Jina Reader → Tavily → Basic httpx

    Args:
        url: URL to fetch
        timeout: Timeout in milliseconds

    Returns:
        Extracted text content (markdown-like format)

    Raises:
        FetchError: If all fetch methods fail
    """
    errors = []

    # Try Jina Reader first (free, renders JS)
    try:
        content = await fetch_with_jina(url, timeout)
        if content and len(content.strip()) > 100:  # Sanity check for real content
            return content
    except Exception as e:
        errors.append(f"Jina: {e}")

    # Try Tavily next (if key available, renders JS)
    try:
        content = await fetch_with_tavily(url)
        if content and len(content.strip()) > 100:
            return content
    except Exception as e:
        errors.append(f"Tavily: {e}")

    # Fall back to basic httpx + trafilatura
    try:
        content = await fetch_basic(url, timeout)
        if content:
            return content
    except Exception as e:
        errors.append(f"Basic: {e}")

    # All methods failed
    raise FetchError(url, f"All fetch methods failed: {'; '.join(errors)}")


async def fetch_with_jina(url: str, timeout: int = 30000) -> str:
    """
    Fetch URL using Jina Reader API (renders JavaScript).

    Jina Reader is free and renders JS-heavy pages before extracting content.
    Just prepend https://r.jina.ai/ to any URL.

    Args:
        url: URL to fetch
        timeout: Timeout in milliseconds

    Returns:
        Rendered and extracted content as markdown
    """
    timeout_seconds = timeout / 1000
    jina_url = f"https://r.jina.ai/{url}"

    async with httpx.AsyncClient(
        timeout=timeout_seconds,
        follow_redirects=True,
        headers={
            "User-Agent": "Shutter/0.1 (Web Content Distillation Service)",
            "Accept": "text/plain",  # Jina returns markdown with this
        }
    ) as client:
        response = await client.get(jina_url)
        response.raise_for_status()
        return response.text


async def fetch_with_tavily(url: str) -> str:
    """
    Fetch using Tavily SDK for JavaScript-rendered content.

    Args:
        url: URL to fetch

    Returns:
        Extracted page content

    Raises:
        Exception: If Tavily fails or no API key
    """
    tavily_key = get_api_key("tavily")

    if not tavily_key:
        raise ValueError("No Tavily API key configured")

    from tavily import TavilyClient

    client = TavilyClient(api_key=tavily_key)

    # Use Tavily extract for single URL
    result = client.extract(urls=[url])

    if result and "results" in result and len(result["results"]) > 0:
        content = result["results"][0].get("raw_content", "")
        if content:
            return content

    raise ValueError("Tavily returned no content")


async def fetch_basic(url: str, timeout: int = 30000) -> str:
    """
    Basic fetch using httpx and trafilatura (no JS rendering).

    Args:
        url: URL to fetch
        timeout: Timeout in milliseconds

    Returns:
        Extracted text content

    Raises:
        FetchError: If fetching or extraction fails
    """
    timeout_seconds = timeout / 1000

    try:
        async with httpx.AsyncClient(
            timeout=timeout_seconds,
            follow_redirects=True,
            headers={
                "User-Agent": "Shutter/0.1 (Web Content Distillation Service)"
            }
        ) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text
    except httpx.TimeoutException:
        raise FetchError(url, "Request timed out")
    except httpx.HTTPStatusError as e:
        raise FetchError(url, f"HTTP {e.response.status_code}")
    except httpx.RequestError as e:
        raise FetchError(url, str(e))

    # Extract clean text from HTML using trafilatura
    extracted = html_to_text(html)
    if not extracted:
        raise FetchError(url, "Could not extract content from page")

    return extracted


def html_to_text(html: str) -> Optional[str]:
    """
    Convert HTML to clean text using trafilatura.

    Removes navigation, ads, boilerplate content and extracts
    main article content in a readable format.

    Args:
        html: Raw HTML content

    Returns:
        Extracted text content, or None if extraction fails
    """
    # trafilatura.extract returns clean text/markdown
    # include_comments=False to avoid potential injection vectors
    # include_tables=True to preserve tabular data
    extracted = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=True,
        include_links=False,  # Links often add noise
        output_format="txt",  # Plain text is sufficient
        deduplicate=True,
    )
    return extracted


def extract_domain(url: str) -> str:
    """
    Extract domain from URL for offenders list tracking.

    Args:
        url: Full URL

    Returns:
        Domain name (e.g., "example.com")
    """
    from urllib.parse import urlparse

    parsed = urlparse(url)
    domain = parsed.netloc

    # Remove www. prefix for consistency
    if domain.startswith("www."):
        domain = domain[4:]

    # Remove port if present
    if ":" in domain:
        domain = domain.split(":")[0]

    return domain
