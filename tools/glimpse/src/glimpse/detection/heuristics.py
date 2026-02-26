"""CSS selector heuristics for Glimpse element detection.

Maps common natural language descriptions to CSS selectors.
This is the second step in the detection fallback chain.
"""

from playwright.async_api import Page, Locator


# Mapping of common terms to CSS selectors
ELEMENT_MAP: dict[str, list[str]] = {
    "hero": [".hero", ".hero-section", "[role=banner] .hero", "section:first-of-type"],
    "header": ["header", "[role=banner]", ".header", ".site-header"],
    "footer": ["footer", "[role=contentinfo]", ".footer", ".site-footer"],
    "navigation": ["nav", "[role=navigation]", ".nav", ".navbar", ".navigation"],
    "sidebar": ["aside", "[role=complementary]", ".sidebar", ".side-panel"],
    "main content": ["main", "[role=main]", ".main-content", "#content"],
    "search": ["[role=search]", 'input[type=search]', ".search-box", "#search"],
    "pricing": [".pricing", ".pricing-cards", ".pricing-section"],
    "gallery": [".gallery", ".image-gallery", "[role=img]"],
    "form": ["form", ".form", "[role=form]"],
    "modal": ["[role=dialog]", ".modal", ".dialog"],
    "card": [".card", ".glass-card", "[role=article]"],
    "button": ["button", "[role=button]", ".btn"],
    "logo": [".logo", ".site-logo", 'img[alt*=logo]'],
}


async def find_by_heuristic(page: Page, description: str) -> Locator | None:
    """Try to find an element using CSS selector heuristics.

    Searches the ELEMENT_MAP for terms matching the description,
    then tries each selector until one matches on the page.
    """
    desc_lower = description.lower()

    # Find matching selectors from the map
    matching_selectors = []
    for term, selectors in ELEMENT_MAP.items():
        if term in desc_lower or desc_lower in term:
            matching_selectors.extend(selectors)

    # Try each selector
    for selector in matching_selectors:
        try:
            locator = page.locator(selector)
            count = await locator.count()
            if count > 0:
                return locator.first
        except Exception:
            continue

    return None
