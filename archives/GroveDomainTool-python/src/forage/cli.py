"""
Command-line interface for grove-domain-tool

Provides terminal-based domain checking with pricing information
and beautiful output inspired by Charm's tools.
"""

import asyncio
import sys
import argparse
import json
from typing import List, Optional
from pathlib import Path

from .checker import check_domain, check_domains, DomainResult
from .pricing import get_domain_pricing, get_batch_pricing, categorize_domains_by_pricing
from .config import config
from .orchestrator import DomainSearchOrchestrator, SearchState, quick_search
from .quiz.schema import InitialQuiz


def format_domain_result(result: DomainResult, price_info=None) -> str:
    """Format a single domain result for terminal output."""
    if result.status == "AVAILABLE":
        status = "✓ AVAILABLE"
        color = "\033[92m"  # Green
    elif result.status == "REGISTERED":
        status = "✗ REGISTERED"
        color = "\033[91m"  # Red
    else:
        status = "? UNKNOWN"
        color = "\033[93m"  # Yellow
    
    # Base status line
    output = f"{color}{result.domain}: {status}\033[0m"
    
    # Add pricing if available
    if price_info and result.status == "AVAILABLE":
        output += f" ${price_info.price_dollars:.2f} ({price_info.category})"
    
    # Add registration details
    if result.status == "REGISTERED":
        details = []
        if result.registrar:
            details.append(f"Registrar: {result.registrar}")
        if result.expiration:
            details.append(f"Expires: {result.expiration}")
        if details:
            output += f"\n    {' | '.join(details)}"
    
    # Add error info
    if result.status == "UNKNOWN" and result.error:
        output += f"\n    Error: {result.error}"
    
    return output


def print_results_summary(results: List[DomainResult], pricing_info: dict = None):
    """Print a formatted summary of results."""
    # Group by status
    available = [r for r in results if r.status == "AVAILABLE"]
    registered = [r for r in results if r.status == "REGISTERED"]
    unknown = [r for r in results if r.status == "UNKNOWN"]
    
    print("\n" + "=" * 60)
    print("DOMAIN CHECK RESULTS")
    print("=" * 60)
    
    # Available domains with pricing
    if available:
        print(f"\n🟢 AVAILABLE ({len(available)}):")
        for result in available:
            price_info = pricing_info.get(result.domain) if pricing_info else None
            print(f"  {format_domain_result(result, price_info)}")
        
        # Pricing summary for available domains
        if pricing_info:
            available_pricing = [pricing_info[d.domain] for d in available if d.domain in pricing_info]
            if available_pricing:
                categories = categorize_domains_by_pricing(pricing_info)
                print(f"\n    Pricing Summary:")
                for category, domains in categories.items():
                    if domains:
                        symbol = {
                            "bundled": "📦",
                            "recommended": "✅",
                            "standard": "🔹",
                            "premium": "💎"
                        }.get(category, "🔹")
                        print(f"      {symbol} {category.title()}: {len(domains)} domains")
    
    # Registered domains
    if registered:
        print(f"\n🔴 REGISTERED ({len(registered)}):")
        for result in registered:
            print(f"  {format_domain_result(result)}")
    
    # Unknown status
    if unknown:
        print(f"\n🟡 UNKNOWN ({len(unknown)}):")
        for result in unknown:
            print(f"  {format_domain_result(result)}")
    
    print()


async def check_single_domain(domain: str, include_pricing: bool = True) -> DomainResult:
    """Check a single domain with optional pricing."""
    result = check_domain(domain)
    
    if include_pricing and result.status == "AVAILABLE":
        try:
            pricing = await get_domain_pricing(domain)
            if pricing:
                # Store pricing info for later use
                result._pricing_info = pricing
        except Exception as e:
            print(f"Warning: Could not fetch pricing for {domain}: {e}", file=sys.stderr)
    
    return result


async def check_multiple_domains(domains: List[str], include_pricing: bool = True) -> List[DomainResult]:
    """Check multiple domains with optional pricing."""
    # First check availability
    results = check_domains(domains, delay=config.rate_limit.rdap_delay_seconds, progress=True)
    
    # Then fetch pricing for available domains
    if include_pricing:
        available_domains = [r.domain for r in results if r.status == "AVAILABLE"]
        if available_domains:
            try:
                pricing_info = await get_batch_pricing(available_domains)
                # Attach pricing to results
                for result in results:
                    if result.domain in pricing_info:
                        result._pricing_info = pricing_info[result.domain]
            except Exception as e:
                print(f"Warning: Could not fetch pricing: {e}", file=sys.stderr)
    
    return results


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="grove-domain-tool",
        description="AI-powered domain availability checker with pricing",
        epilog="Example: grove-domain-tool check example.com test.io mysite.dev"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Check command
    check_parser = subparsers.add_parser("check", help="Check domain availability")
    check_parser.add_argument(
        "domains",
        nargs="+",
        help="Domain names to check, or path to file with one domain per line"
    )
    check_parser.add_argument(
        "--no-pricing",
        action="store_true",
        help="Skip pricing lookup"
    )
    check_parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    check_parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress progress output"
    )

    # Search command (AI-powered)
    search_parser = subparsers.add_parser("search", help="AI-powered domain search")
    search_parser.add_argument(
        "business_name",
        help="Business or project name to find domains for"
    )
    search_parser.add_argument(
        "--vibe",
        choices=["professional", "creative", "minimal", "bold", "personal"],
        default="professional",
        help="Brand vibe (default: professional)"
    )
    search_parser.add_argument(
        "--tlds",
        nargs="+",
        default=["com", "co", "io"],
        help="Preferred TLDs (default: com co io)"
    )
    search_parser.add_argument(
        "--keywords",
        help="Additional keywords or themes"
    )
    search_parser.add_argument(
        "--batches",
        type=int,
        default=2,
        help="Number of batches to run (default: 2)"
    )
    search_parser.add_argument(
        "--mock",
        action="store_true",
        help="Use mock AI (for testing without API key)"
    )
    search_parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )

    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == "check":
        # Collect domains - either from args or from file
        domains = []
        for item in args.domains:
            # Check if it's a file
            try:
                file_path = Path(item)
                if file_path.exists() and file_path.is_file():
                    with open(file_path, "r") as f:
                        file_domains = [line.strip() for line in f if line.strip() and not line.startswith("#")]
                        domains.extend(file_domains)
                else:
                    # Not a file, treat as domain name
                    domains.append(item)
            except Exception:
                # Treat as domain name if file reading fails
                domains.append(item)
        
        if not domains:
            print("No domains to check", file=sys.stderr)
            sys.exit(1)
        
        # Run checks
        include_pricing = not args.no_pricing
        
        async def run_checks():
            if len(domains) == 1:
                results = [await check_single_domain(domains[0], include_pricing)]
            else:
                results = await check_multiple_domains(domains, include_pricing)
            
            # Extract pricing info for output
            pricing_info = {}
            if include_pricing:
                for result in results:
                    if hasattr(result, '_pricing_info'):
                        pricing_info[result.domain] = result._pricing_info
            
            # Output
            if args.json:
                # Convert to JSON
                json_results = []
                for result in results:
                    result_dict = {
                        "domain": result.domain,
                        "status": result.status,
                        "registrar": result.registrar,
                        "expiration": result.expiration,
                        "creation": result.creation,
                        "error": result.error
                    }
                    
                    # Add pricing if available
                    if result.domain in pricing_info:
                        price = pricing_info[result.domain]
                        result_dict["pricing"] = {
                            "price_cents": price.price_cents,
                            "price_dollars": price.price_dollars,
                            "currency": price.currency,
                            "category": price.category,
                            "is_bundled": price.is_bundled,
                            "is_recommended": price.is_recommended,
                            "is_premium": price.is_premium
                        }
                    
                    json_results.append(result_dict)
                
                print(json.dumps(json_results, indent=2))
            else:
                # Human-readable output
                print_results_summary(results, pricing_info if include_pricing else None)
        
        # Run the async function
        asyncio.run(run_checks())

    elif args.command == "search":
        # AI-powered domain search
        async def run_search():
            print(f"\n🔍 Searching for domains for \"{args.business_name}\"...")
            print(f"   Vibe: {args.vibe}")
            print(f"   TLDs: {', '.join('.' + t for t in args.tlds)}")
            if args.keywords:
                print(f"   Keywords: {args.keywords}")
            print(f"   Batches: {args.batches}")
            print()

            # Run the search
            result = await quick_search(
                business_name=args.business_name,
                vibe=args.vibe,
                tld_preferences=args.tlds,
                keywords=args.keywords,
                max_batches=args.batches,
                use_mock=args.mock or True,  # Default to mock for now
            )

            # Create orchestrator for output formatting
            orchestrator = DomainSearchOrchestrator(use_mock=True)

            if args.json:
                # JSON output
                output = {
                    "job_id": result.job_id,
                    "status": result.status.value,
                    "batch_num": result.batch_num,
                    "quiz": result.quiz.to_dict() if result.quiz else None,
                    "results_count": len(result.all_results),
                    "good_count": result.good_count,
                    "checked_domains": len(result.checked_domains),
                    "available_domains": len(result.available_domains),
                    "domains": [r.to_dict() for r in orchestrator.get_ranked_results(result)],
                }
                print(json.dumps(output, indent=2))
            else:
                # Terminal-style output
                print(orchestrator.format_results_terminal(result))

                # Summary
                print(f"Search Status: {result.status.value}")
                print(f"Batches: {result.batch_num}")
                print(f"Domains Checked: {len(result.checked_domains)}")
                print(f"Available: {len(result.available_domains)}")
                print(f"Good Results: {result.good_count}")

                # Usage stats
                usage = result.usage
                print(f"\nAPI Usage:")
                print(f"  Tokens: {usage.total_tokens:,} ({usage.input_tokens:,} in / {usage.output_tokens:,} out)")
                print(f"  Est. Cost: ${usage.estimated_cost_usd:.4f}")

        asyncio.run(run_search())


if __name__ == "__main__":
    main()