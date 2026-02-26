"""Target resolution for Glimpse browse — find elements from descriptions.

Uses a three-step fallback chain:
1. Playwright's built-in accessible selectors (getByRole, getByText, getByLabel)
2. CSS heuristics mapping (common names -> selectors)
3. Lumen AI fallback (Phase 6, returns None until implemented)
"""

from playwright.async_api import Page, Locator


# Common name-to-selector heuristics
_HEURISTICS: dict[str, list[str]] = {
    "hero": [".hero", ".hero-section", "[role=banner]", "header .hero"],
    "header": ["header", "[role=banner]", ".header"],
    "footer": ["footer", "[role=contentinfo]", ".footer"],
    "nav": ["nav", "[role=navigation]", ".nav", ".navbar"],
    "navigation": ["nav", "[role=navigation]", ".nav", ".navbar"],
    "sidebar": ["aside", "[role=complementary]", ".sidebar"],
    "main": ["main", "[role=main]", ".main-content"],
    "search": ["[role=search]", 'input[type=search]', ".search", "#search"],
    "login": ['form[action*=login]', ".login-form", "#login"],
    "menu": ["[role=menu]", ".menu", "nav ul"],
}


class TargetResolver:
    """Resolves natural language element descriptions to Playwright locators."""

    def __init__(self, page: Page) -> None:
        self._page = page

    async def resolve(self, description: str) -> Locator | None:
        """Find an element matching the description.

        Tries accessible selectors first, then heuristics, then returns None
        (Lumen fallback is wired in Phase 6).
        """
        # Step 1: Accessible selectors via Playwright
        locator = await self._try_accessible(description)
        if locator:
            return locator

        # Step 2: CSS heuristics
        locator = await self._try_heuristics(description)
        if locator:
            return locator

        # Step 3: Lumen AI fallback (Phase 6)
        # Returns None — unresolved targets are reported as errors
        return None

    async def _try_accessible(self, description: str) -> Locator | None:
        """Try Playwright's built-in accessible element selectors."""
        desc_lower = description.lower().strip()

        # Try getByRole with name
        for role in ["link", "button", "heading", "tab", "menuitem", "textbox", "checkbox"]:
            try:
                locator = self._page.get_by_role(role, name=description)
                count = await locator.count()
                if count > 0:
                    return locator.first
            except Exception:
                continue

        # Try getByText
        try:
            locator = self._page.get_by_text(description, exact=False)
            count = await locator.count()
            if count > 0:
                return locator.first
        except Exception:
            pass

        # Try getByLabel (for form inputs)
        try:
            locator = self._page.get_by_label(description)
            count = await locator.count()
            if count > 0:
                return locator.first
        except Exception:
            pass

        # Try getByPlaceholder
        try:
            locator = self._page.get_by_placeholder(description)
            count = await locator.count()
            if count > 0:
                return locator.first
        except Exception:
            pass

        return None

    async def _try_heuristics(self, description: str) -> Locator | None:
        """Try CSS selector heuristics for common element names."""
        desc_lower = description.lower().strip()

        # Check direct match in heuristics table
        for key, selectors in _HEURISTICS.items():
            if key in desc_lower:
                for selector in selectors:
                    try:
                        locator = self._page.locator(selector)
                        count = await locator.count()
                        if count > 0:
                            return locator.first
                    except Exception:
                        continue

        # Try the description directly as a CSS selector
        try:
            locator = self._page.locator(description)
            count = await locator.count()
            if count > 0:
                return locator.first
        except Exception:
            pass

        return None
