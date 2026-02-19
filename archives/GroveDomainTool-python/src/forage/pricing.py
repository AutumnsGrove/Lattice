"""
Domain pricing lookup using Cloudflare Registrar pricing data.

Uses cfdomainpricing.com which provides an up-to-date JSON endpoint
with all Cloudflare Registrar prices. Cloudflare uses fixed TLD-based
pricing with no premium domain markups.

Provides pricing information for available domains and categorizes them
based on configured thresholds (bundled, recommended, premium).
"""

import json
import httpx
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, List

from .config import config


# Cache configuration
PRICING_API_URL = "https://cfdomainpricing.com/prices.json"
CACHE_TTL_SECONDS = 86400  # 24 hours
CACHE_FILE_NAME = ".cloudflare_pricing_cache.json"


@dataclass
class DomainPrice:
    """Pricing information for a domain."""
    domain: str
    tld: str
    price_cents: int
    currency: str = "USD"
    is_premium: bool = False
    is_bundled: bool = False
    is_recommended: bool = False
    annual_renewal_cents: Optional[int] = None

    def __post_init__(self):
        """Categorize based on pricing thresholds."""
        self.is_bundled = self.price_cents <= config.pricing.bundled_max_cents
        self.is_recommended = self.price_cents <= config.pricing.recommended_max_cents
        self.is_premium = self.price_cents >= config.pricing.premium_flag_above_cents

    @property
    def price_dollars(self) -> float:
        """Price in dollars for display."""
        return self.price_cents / 100.0

    @property
    def category(self) -> str:
        """Get pricing category."""
        if self.is_bundled:
            return "bundled"
        elif self.is_recommended:
            return "recommended"
        elif self.is_premium:
            return "premium"
        else:
            return "standard"

    def __str__(self) -> str:
        """Human-readable pricing info."""
        category_symbol = {
            "bundled": "📦",
            "recommended": "✅",
            "premium": "💎",
            "standard": "🔹"
        }.get(self.category, "🔹")

        return f"{category_symbol} {self.domain}: ${self.price_dollars:.2f} ({self.category})"


class PricingError(Exception):
    """Pricing lookup failed."""
    pass


def _get_cache_path() -> Path:
    """Get the cache file path in the project root or temp directory."""
    # Try project root first
    project_root = Path(__file__).parent.parent.parent
    cache_path = project_root / CACHE_FILE_NAME

    # Fallback to temp directory if project root isn't writable
    if not project_root.exists():
        import tempfile
        cache_path = Path(tempfile.gettempdir()) / CACHE_FILE_NAME

    return cache_path


class CloudflarePricing:
    """
    Cloudflare domain pricing client using cfdomainpricing.com.

    Features:
    - File-based caching with 24-hour TTL
    - Graceful fallback to stale cache on fetch failures
    - In-memory TLD -> pricing mapping for fast lookups
    """

    def __init__(self, timeout: float = 10.0):
        """Initialize pricing client."""
        self.timeout = timeout
        self._tld_cache: Dict[str, Dict[str, float]] = {}  # tld -> {registration, renewal}
        self._cache_loaded_at: Optional[float] = None

    def _load_from_file_cache(self) -> Optional[Dict[str, Dict[str, float]]]:
        """Load pricing data from file cache."""
        cache_path = _get_cache_path()

        if not cache_path.exists():
            return None

        try:
            with open(cache_path, "r") as f:
                cached = json.load(f)

            # Check if cache is still valid
            cached_at = cached.get("cached_at", 0)
            pricing_data = cached.get("pricing", {})

            # Return data even if expired (for fallback)
            return {
                "pricing": pricing_data,
                "cached_at": cached_at,
                "is_stale": (time.time() - cached_at) > CACHE_TTL_SECONDS
            }
        except (json.JSONDecodeError, KeyError, IOError):
            return None

    def _save_to_file_cache(self, pricing_data: Dict[str, Dict[str, float]]) -> None:
        """Save pricing data to file cache."""
        cache_path = _get_cache_path()

        try:
            with open(cache_path, "w") as f:
                json.dump({
                    "cached_at": time.time(),
                    "pricing": pricing_data
                }, f)
        except IOError:
            # Silently fail if we can't write cache
            pass

    async def _fetch_pricing_data(self) -> Dict[str, Dict[str, float]]:
        """
        Fetch pricing data from cfdomainpricing.com.

        Returns:
            Dict mapping TLD -> {registration: price, renewal: price}
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(PRICING_API_URL)
            response.raise_for_status()

            data = response.json()

            # Validate structure - expects {tld: {registration, renewal}}
            if not isinstance(data, dict):
                raise PricingError("Invalid pricing data format")

            return data

    async def _ensure_cache_loaded(self) -> None:
        """Ensure pricing data is loaded into memory."""
        # Check if we have fresh in-memory cache
        if self._tld_cache and self._cache_loaded_at:
            cache_age = time.time() - self._cache_loaded_at
            if cache_age < CACHE_TTL_SECONDS:
                return

        # Try file cache first
        file_cache = self._load_from_file_cache()

        if file_cache and not file_cache.get("is_stale", True):
            # Fresh file cache - use it
            self._tld_cache = file_cache["pricing"]
            self._cache_loaded_at = file_cache["cached_at"]
            return

        # Need to fetch fresh data
        try:
            fresh_data = await self._fetch_pricing_data()
            self._tld_cache = fresh_data
            self._cache_loaded_at = time.time()
            self._save_to_file_cache(fresh_data)
        except (httpx.HTTPError, PricingError) as e:
            # Fetch failed - use stale cache if available
            if file_cache:
                self._tld_cache = file_cache["pricing"]
                self._cache_loaded_at = file_cache["cached_at"]
            else:
                raise PricingError(f"Failed to fetch pricing data: {e}")

    async def get_tld_pricing(self, tld: str) -> Optional[DomainPrice]:
        """
        Get pricing information for a specific TLD.

        Args:
            tld: Top-level domain (e.g., "com", "io", "dev")

        Returns:
            DomainPrice object or None if TLD not supported by Cloudflare
        """
        await self._ensure_cache_loaded()

        # Normalize TLD (remove leading dot if present)
        tld = tld.lower().lstrip(".")

        pricing_info = self._tld_cache.get(tld)
        if not pricing_info:
            return None

        # Convert dollars to cents
        registration = pricing_info.get("registration", 0)
        renewal = pricing_info.get("renewal", registration)

        price_cents = int(registration * 100)
        renewal_cents = int(renewal * 100)

        return DomainPrice(
            domain=f".{tld}",
            tld=tld,
            price_cents=price_cents,
            annual_renewal_cents=renewal_cents
        )

    async def get_domain_pricing(self, domain: str) -> Optional[DomainPrice]:
        """
        Get pricing for a full domain name.

        Args:
            domain: Full domain name (e.g., "example.com")

        Returns:
            DomainPrice object or None if TLD not supported by Cloudflare
        """
        # Extract TLD
        tld = domain.lower().split(".")[-1]
        pricing = await self.get_tld_pricing(tld)

        if pricing:
            # Create a copy with the full domain name
            return DomainPrice(
                domain=domain,
                tld=pricing.tld,
                price_cents=pricing.price_cents,
                currency=pricing.currency,
                annual_renewal_cents=pricing.annual_renewal_cents
            )

        return None

    async def batch_pricing(self, domains: List[str]) -> Dict[str, DomainPrice]:
        """
        Get pricing for multiple domains efficiently.

        Args:
            domains: List of domain names

        Returns:
            Dict mapping domain -> DomainPrice (only for domains with Cloudflare pricing)
        """
        await self._ensure_cache_loaded()

        domain_pricing = {}
        for domain in domains:
            tld = domain.lower().split(".")[-1]
            pricing_info = self._tld_cache.get(tld)

            if pricing_info:
                registration = pricing_info.get("registration", 0)
                renewal = pricing_info.get("renewal", registration)

                domain_pricing[domain] = DomainPrice(
                    domain=domain,
                    tld=tld,
                    price_cents=int(registration * 100),
                    currency="USD",
                    annual_renewal_cents=int(renewal * 100)
                )

        return domain_pricing

    async def get_supported_tlds(self) -> List[str]:
        """
        Get list of all TLDs supported by Cloudflare Registrar.

        Returns:
            List of TLD strings (without leading dot)
        """
        await self._ensure_cache_loaded()
        return list(self._tld_cache.keys())

    def is_tld_supported(self, tld: str) -> bool:
        """
        Check if a TLD is supported by Cloudflare Registrar.

        Note: Requires cache to be loaded first (call get_tld_pricing or batch_pricing).

        Args:
            tld: Top-level domain (e.g., "com", "io")

        Returns:
            True if TLD is supported by Cloudflare
        """
        tld = tld.lower().lstrip(".")
        return tld in self._tld_cache


# Singleton instance
pricing_client = CloudflarePricing()


async def get_domain_pricing(domain: str) -> Optional[DomainPrice]:
    """
    Convenience function to get pricing for a single domain.

    Args:
        domain: Domain name to check

    Returns:
        DomainPrice object or None if TLD not supported by Cloudflare
    """
    return await pricing_client.get_domain_pricing(domain)


async def get_batch_pricing(domains: List[str]) -> Dict[str, DomainPrice]:
    """
    Convenience function to get pricing for multiple domains.

    Args:
        domains: List of domain names

    Returns:
        Dict mapping domain -> DomainPrice
    """
    return await pricing_client.batch_pricing(domains)


async def get_supported_tlds() -> List[str]:
    """
    Get list of all TLDs supported by Cloudflare Registrar.

    Returns:
        List of TLD strings
    """
    return await pricing_client.get_supported_tlds()


def categorize_domains_by_pricing(domain_prices: Dict[str, DomainPrice]) -> Dict[str, List[str]]:
    """
    Categorize domains by pricing tiers.

    Args:
        domain_prices: Dict of domain -> DomainPrice

    Returns:
        Dict with categories as keys and lists of domains as values
    """
    categories = {
        "bundled": [],
        "recommended": [],
        "standard": [],
        "premium": []
    }

    for domain, price_info in domain_prices.items():
        categories[price_info.category].append(domain)

    return categories