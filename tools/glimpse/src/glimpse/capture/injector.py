"""Theme injection for Glimpse.

Pre-seeds localStorage before page navigation so Svelte stores pick up
the correct season/theme/grove-mode on first render. No flash of default theme.

Defense-in-depth: values are checked against allowlists here even though
the CLI layer validates them too. This prevents JS injection if a caller
bypasses validation.
"""

_SAFE_SEASONS = {"spring", "summer", "autumn", "winter", "midnight"}
_SAFE_THEMES = {"light", "dark", "system"}


def build_init_script(
    season: str | None = None,
    theme: str | None = None,
    grove_mode: bool | None = None,
) -> str | None:
    """Build a JavaScript init script for localStorage pre-seeding.

    This runs before any page JavaScript, so the Svelte stores pick up
    the correct values on first read — no flash of default theme.

    Returns None if no values need to be set (no injection needed).
    Raises ValueError if an unsafe value is provided.
    """
    statements = []

    if season:
        if season not in _SAFE_SEASONS:
            raise ValueError(f"Unsafe season value rejected: {season!r}")
        statements.append(f"localStorage.setItem('grove-season', '{season}');")

    if theme:
        if theme not in _SAFE_THEMES:
            raise ValueError(f"Unsafe theme value rejected: {theme!r}")
        statements.append(f"localStorage.setItem('theme', '{theme}');")
        # Apply dark class immediately to prevent flash
        if theme == "dark":
            statements.append("document.documentElement.classList.add('dark');")
        elif theme == "light":
            statements.append("document.documentElement.classList.remove('dark');")

    if grove_mode is not None:
        val = "true" if grove_mode else "false"
        statements.append(f"localStorage.setItem('grove-mode', '{val}');")

    if not statements:
        return None

    return "\n".join(statements)
