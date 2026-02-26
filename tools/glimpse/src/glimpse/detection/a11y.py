"""Accessibility tree detection for Glimpse.

Snapshots the page's accessibility tree and searches for elements
matching a natural language description by role and name.
"""

from playwright.async_api import Page


async def find_in_a11y_tree(page: Page, description: str) -> dict | None:
    """Search the accessibility tree for an element matching the description.

    Returns a dict with 'role', 'name', and 'bounds' if found, or None.
    """
    try:
        snapshot = await page.accessibility.snapshot()
    except Exception:
        return None

    if not snapshot:
        return None

    desc_lower = description.lower()

    # Recursive search through the tree
    def _search(node: dict) -> dict | None:
        name = (node.get("name") or "").lower()
        role = (node.get("role") or "").lower()

        # Match by name containing description, or role matching
        if desc_lower in name or desc_lower == role:
            return node

        for child in node.get("children", []):
            result = _search(child)
            if result:
                return result

        return None

    return _search(snapshot)
