#!/usr/bin/env python3
"""
Domain Availability Checker

A bulk domain availability checking tool using free RDAP (Registration Data Access Protocol) APIs.
No API keys required. RDAP is the modern, IETF-standard replacement for WHOIS.

USAGE:
python domain_checker.py domains.txt           # Check domains from file (one per line)
python domain_checker.py example.com foo.io    # Check specific domains
python domain_checker.py --json domains.txt    # Output as JSON

HOW IT WORKS:
1. For each domain, we first look up the correct RDAP server for that TLD
   using IANA's bootstrap file (cached locally for performance)
2. Query the RDAP server for domain registration data
3. If we get data back, domain is registered. If 404, likely available.

RATE LIMITING:
- Built-in delays between requests (configurable)
- Respects server rate limits
- Default: 0.5 seconds between requests

OUTPUT:
- REGISTERED: Domain is taken, shows registrar and expiration if available
- AVAILABLE: Domain appears to be available for registration
- UNKNOWN: Could not determine status (server error, unsupported TLD, etc.)

NOTES FOR AGENTS:
- Main entry point: check_domains() or check_domain()
- Results are DomainResult dataclass objects
- Easy to extend: add new TLD handlers in get_rdap_server()
- Can be imported as a module or run as CLI
"""

import sys
import json
import time
import argparse
from dataclasses import dataclass, asdict
from typing import Optional
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from functools import lru_cache

# ============================================================================
# CONFIGURATION
# ============================================================================

# Delay between requests in seconds (be nice to free APIs)
REQUEST_DELAY = 0.5

# Request timeout in seconds
TIMEOUT = 10

# User agent for requests
USER_AGENT = "DomainChecker/1.0 (bulk availability check tool)"

# IANA RDAP bootstrap URL - maps TLDs to their RDAP servers
IANA_RDAP_BOOTSTRAP = "https://data.iana.org/rdap/dns.json"

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class DomainResult:
    """Result of a domain availability check."""
    domain: str
    status: str  # "REGISTERED", "AVAILABLE", or "UNKNOWN"
    registrar: Optional[str] = None
    expiration: Optional[str] = None
    creation: Optional[str] = None
    error: Optional[str] = None

    def __str__(self):
        if self.status == "REGISTERED":
            parts = [f"{self.domain}: REGISTERED"]
            if self.registrar:
                parts.append(f"  Registrar: {self.registrar}")
            if self.expiration:
                parts.append(f"  Expires: {self.expiration}")
            return "\n".join(parts)
        elif self.status == "AVAILABLE":
            return f"{self.domain}: AVAILABLE ✓"
        else:
            return f"{self.domain}: UNKNOWN ({self.error or 'no details'})"

# ============================================================================
# RDAP SERVER LOOKUP
# ============================================================================

@lru_cache(maxsize=1)
def fetch_rdap_bootstrap() -> dict:
    """
    Fetch IANA's RDAP bootstrap file which maps TLDs to RDAP servers.
    Cached for the lifetime of the script.

    Returns:
        dict mapping TLD -> RDAP server URL
    """
    try:
        req = Request(IANA_RDAP_BOOTSTRAP, headers={"User-Agent": USER_AGENT})
        with urlopen(req, timeout=TIMEOUT) as response:
            data = json.loads(response.read().decode())

        # Build TLD -> server mapping
        tld_map = {}
        for entry in data.get("services", []):
            tlds = entry[0]  # List of TLDs
            servers = entry[1]  # List of RDAP server URLs
            if servers:
                server = servers[0].rstrip("/")
                for tld in tlds:
                    tld_map[tld.lower()] = server

        return tld_map
    except Exception as e:
        print(f"Warning: Could not fetch RDAP bootstrap: {e}", file=sys.stderr)
        return {}

def get_rdap_server(domain: str) -> Optional[str]:
    """
    Get the RDAP server URL for a given domain.

    Args:
        domain: The domain name (e.g., "example.com")

    Returns:
        RDAP server URL or None if TLD not supported
    """
    tld = domain.lower().split(".")[-1]
    bootstrap = fetch_rdap_bootstrap()
    return bootstrap.get(tld)

# ============================================================================
# DOMAIN CHECKING
# ============================================================================

def check_domain(domain: str) -> DomainResult:
    """
    Check availability of a single domain using RDAP.

    Args:
        domain: The domain name to check (e.g., "example.com")

    Returns:
        DomainResult with status and registration details
    """
    domain = domain.lower().strip()

    # Get RDAP server for this TLD
    rdap_server = get_rdap_server(domain)
    if not rdap_server:
        return DomainResult(
            domain=domain,
            status="UNKNOWN",
            error=f"No RDAP server found for TLD .{domain.split('.')[-1]}"
        )

    # Query RDAP
    url = f"{rdap_server}/domain/{domain}"
    try:
        req = Request(url, headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rdap+json, application/json"
        })
        with urlopen(req, timeout=TIMEOUT) as response:
            data = json.loads(response.read().decode())

        # Domain is registered - extract details
        result = DomainResult(domain=domain, status="REGISTERED")

        # Try to get registrar
        for entity in data.get("entities", []):
            roles = entity.get("roles", [])
            if "registrar" in roles:
                # Try different places the name might be
                vcard = entity.get("vcardArray", [])
                if len(vcard) > 1:
                    for item in vcard[1]:
                        if item[0] == "fn":
                            result.registrar = item[3]
                            break
                if not result.registrar:
                    result.registrar = entity.get("handle")
                break

        # Try to get dates
        for event in data.get("events", []):
            action = event.get("eventAction")
            date = event.get("eventDate", "")[:10]  # Just the date part
            if action == "expiration":
                result.expiration = date
            elif action == "registration":
                result.creation = date

        return result

    except HTTPError as e:
        if e.code == 404:
            # 404 typically means domain is not registered
            return DomainResult(domain=domain, status="AVAILABLE")
        elif e.code == 429:
            return DomainResult(
                domain=domain,
                status="UNKNOWN",
                error="Rate limited - try again later"
            )
        else:
            return DomainResult(
                domain=domain,
                status="UNKNOWN",
                error=f"HTTP {e.code}: {e.reason}"
            )
    except URLError as e:
        return DomainResult(
            domain=domain,
            status="UNKNOWN",
            error=f"Connection error: {e.reason}"
        )
    except Exception as e:
        return DomainResult(
            domain=domain,
            status="UNKNOWN",
            error=str(e)
        )

def check_domains(domains: list[str], delay: float = REQUEST_DELAY,
                  progress: bool = True) -> list[DomainResult]:
    """
    Check availability of multiple domains.

    Args:
        domains: List of domain names to check
        delay: Seconds to wait between requests (default 0.5)
        progress: Whether to print progress to stderr

    Returns:
        List of DomainResult objects
    """
    results = []
    total = len(domains)

    for i, domain in enumerate(domains):
        if progress:
            print(f"Checking {i+1}/{total}: {domain}...", file=sys.stderr)

        result = check_domain(domain)
        results.append(result)

        # Rate limiting - don't hammer the servers
        if i < total - 1:
            time.sleep(delay)

    return results

# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Bulk domain availability checker using free RDAP APIs",
        epilog="Example: python domain_checker.py example.com test.io mysite.dev"
    )
    parser.add_argument(
        "domains",
        nargs="+",
        help="Domain names to check, or path to file with one domain per line"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=REQUEST_DELAY,
        help=f"Delay between requests in seconds (default: {REQUEST_DELAY})"
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress progress output"
    )

    args = parser.parse_args()

    # Collect domains - either from args or from file
    domains = []
    for item in args.domains:
        # Check if it's a file
        try:
            with open(item, "r") as f:
                file_domains = [line.strip() for line in f if line.strip() and not line.startswith("#")]
                domains.extend(file_domains)
        except FileNotFoundError:
            # Not a file, treat as domain name
            domains.append(item)

    if not domains:
        print("No domains to check", file=sys.stderr)
        sys.exit(1)

    # Run checks
    results = check_domains(domains, delay=args.delay, progress=not args.quiet)

    # Output
    if args.json:
        print(json.dumps([asdict(r) for r in results], indent=2))
    else:
        print("\n" + "=" * 60)
        print("RESULTS")
        print("=" * 60)

        # Group by status
        available = [r for r in results if r.status == "AVAILABLE"]
        registered = [r for r in results if r.status == "REGISTERED"]
        unknown = [r for r in results if r.status == "UNKNOWN"]

        if available:
            print(f"\n✓ AVAILABLE ({len(available)}):")
            for r in available:
                print(f"  {r.domain}")

        if registered:
            print(f"\n✗ REGISTERED ({len(registered)}):")
            for r in registered:
                extra = []
                if r.registrar:
                    extra.append(r.registrar)
                if r.expiration:
                    extra.append(f"expires {r.expiration}")
                suffix = f" ({', '.join(extra)})" if extra else ""
                print(f"  {r.domain}{suffix}")

        if unknown:
            print(f"\n? UNKNOWN ({len(unknown)}):")
            for r in unknown:
                print(f"  {r.domain}: {r.error}")

        print()

if __name__ == "__main__":
    main()
