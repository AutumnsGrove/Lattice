"""
grove-domain-tool: AI-powered asynchronous domain availability checker.

Reduces domain hunting from weeks to hours using AI agents and RDAP checking.
"""

__version__ = "0.1.0"
__author__ = "Autumn Brown"
__email__ = "autumn@grove.place"

from .checker import check_domain, check_domains, DomainResult
from .pricing import get_domain_pricing, get_batch_pricing, DomainPrice, categorize_domains_by_pricing
from .config import config
from .orchestrator import (
    DomainSearchOrchestrator,
    SearchState,
    SearchStatus,
    DomainSearchResult,
    quick_search,
)

__all__ = [
    # Core checker
    "check_domain",
    "check_domains",
    "DomainResult",
    # Pricing
    "get_domain_pricing",
    "get_batch_pricing",
    "DomainPrice",
    "categorize_domains_by_pricing",
    # Config
    "config",
    # Orchestrator
    "DomainSearchOrchestrator",
    "SearchState",
    "SearchStatus",
    "DomainSearchResult",
    "quick_search",
]