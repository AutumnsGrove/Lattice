"""Auto-generate output filenames from capture parameters.

Turns a URL + season/theme into a clean, descriptive filename like:
  grove-place-autumn-dark.png
"""

import re
from pathlib import Path
from urllib.parse import urlparse


def url_to_slug(url: str) -> str:
    """Convert a URL to a filename-safe slug.

    Strips scheme, replaces dots/slashes with hyphens, trims edges.
    Examples:
        https://grove.place         → grove-place
        https://plant.grove.place/blog → plant-grove-place-blog
        https://grove.place/about/  → grove-place-about
    """
    parsed = urlparse(url)
    # Start with hostname + path
    raw = parsed.netloc + parsed.path

    # Strip port numbers
    raw = re.sub(r":\d+", "", raw)

    # Replace non-alphanumeric with hyphens
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", raw)

    # Collapse multiple hyphens and trim
    slug = re.sub(r"-+", "-", slug).strip("-")

    # Fallback for edge case where slug is empty
    return slug.lower() or "capture"


def generate_filename(
    url: str,
    season: str | None = None,
    theme: str | None = None,
    selector: str | None = None,
    fmt: str = "png",
) -> str:
    """Generate a descriptive filename from capture parameters.

    Components are joined with hyphens:
      {url-slug}[-{season}][-{theme}][-{selector-slug}].{format}

    Season and theme are only appended when explicitly set (not defaults).
    Selector is slugified the same way as URLs.

    Returns a filename string (no directory prefix).
    """
    parts = [url_to_slug(url)]

    if season:
        parts.append(season.lower())

    if theme:
        parts.append(theme.lower())

    if selector:
        # Slugify the selector: .hero-section → hero-section
        selector_slug = re.sub(r"[^a-zA-Z0-9]+", "-", selector).strip("-").lower()
        if selector_slug:
            parts.append(selector_slug)

    name = "-".join(parts)
    return f"{name}.{fmt}"


def resolve_output_path(
    output: str | None,
    url: str,
    season: str | None = None,
    theme: str | None = None,
    selector: str | None = None,
    fmt: str = "png",
    output_dir: str = "screenshots",
) -> Path:
    """Resolve the final output path for a capture.

    If output is provided, use it directly (after traversal check).
    Otherwise, auto-generate from URL + parameters into output_dir.

    Returns a resolved Path.
    """
    if output:
        path = Path(output)
        # Reject explicit directory traversal in user-provided paths
        if ".." in path.parts:
            import click
            raise click.BadParameter(
                f"Directory traversal not allowed in output path: '{output}'"
            )
    else:
        filename = generate_filename(url, season, theme, selector, fmt)
        path = Path(output_dir) / filename

    return path.resolve()
