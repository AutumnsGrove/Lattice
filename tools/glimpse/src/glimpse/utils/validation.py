"""Input validation for Glimpse.

Enforces security boundaries: URL scheme restrictions, path traversal
prevention, and sensible numeric bounds for viewport/quality settings.
"""

import click
from urllib.parse import urlparse


ALLOWED_SCHEMES = {"http", "https"}
MAX_URL_LENGTH = 4096
MIN_VIEWPORT = 100
MAX_VIEWPORT = 7680
MIN_SCALE = 1
MAX_SCALE = 4
MIN_QUALITY = 1
MAX_QUALITY = 100
MAX_WAIT_MS = 60000
MAX_TIMEOUT_MS = 120000
VALID_FORMATS = {"png", "jpeg"}
VALID_SEASONS = {"spring", "summer", "autumn", "winter", "midnight"}
VALID_THEMES = {"light", "dark", "system"}


def validate_url(url: str) -> str:
    """Validate and normalize a URL for capture.

    Only http:// and https:// schemes are allowed. Rejects file://,
    javascript:, data:, and other potentially dangerous schemes.

    Returns the validated URL string.
    Raises click.BadParameter on invalid input.
    """
    if not url:
        raise click.BadParameter("URL cannot be empty")

    if len(url) > MAX_URL_LENGTH:
        raise click.BadParameter(
            f"URL exceeds maximum length of {MAX_URL_LENGTH} characters"
        )

    parsed = urlparse(url)

    if not parsed.scheme:
        # Be helpful: assume https if no scheme provided
        url = f"https://{url}"
        parsed = urlparse(url)

    if parsed.scheme not in ALLOWED_SCHEMES:
        raise click.BadParameter(
            f"URL scheme '{parsed.scheme}://' is not allowed. "
            f"Only http:// and https:// are supported."
        )

    if not parsed.netloc:
        raise click.BadParameter(f"Invalid URL: missing hostname in '{url}'")

    return url


def validate_viewport(width: int, height: int) -> tuple[int, int]:
    """Validate viewport dimensions are within reasonable bounds.

    Returns (width, height) tuple.
    Raises click.BadParameter on invalid input.
    """
    if not (MIN_VIEWPORT <= width <= MAX_VIEWPORT):
        raise click.BadParameter(
            f"Viewport width must be between {MIN_VIEWPORT} and {MAX_VIEWPORT}, got {width}"
        )

    if not (MIN_VIEWPORT <= height <= MAX_VIEWPORT):
        raise click.BadParameter(
            f"Viewport height must be between {MIN_VIEWPORT} and {MAX_VIEWPORT}, got {height}"
        )

    return (width, height)


def validate_quality(quality: int) -> int:
    """Validate JPEG quality is in range 1-100.

    Returns the validated quality value.
    Raises click.BadParameter on invalid input.
    """
    if not (MIN_QUALITY <= quality <= MAX_QUALITY):
        raise click.BadParameter(
            f"Quality must be between {MIN_QUALITY} and {MAX_QUALITY}, got {quality}"
        )

    return quality


def validate_format(fmt: str) -> str:
    """Validate output format.

    Returns the validated format string.
    Raises click.BadParameter on invalid input.
    """
    fmt = fmt.lower()
    if fmt not in VALID_FORMATS:
        raise click.BadParameter(
            f"Format must be one of {', '.join(VALID_FORMATS)}, got '{fmt}'"
        )

    return fmt


def validate_season(season: str) -> str:
    """Validate season name.

    Returns the validated season string.
    Raises click.BadParameter on invalid input.
    """
    season = season.lower()
    if season not in VALID_SEASONS:
        raise click.BadParameter(
            f"Season must be one of {', '.join(sorted(VALID_SEASONS))}, got '{season}'"
        )

    return season


def validate_theme(theme: str) -> str:
    """Validate theme name.

    Returns the validated theme string.
    Raises click.BadParameter on invalid input.
    """
    theme = theme.lower()
    if theme not in VALID_THEMES:
        raise click.BadParameter(
            f"Theme must be one of {', '.join(sorted(VALID_THEMES))}, got '{theme}'"
        )

    return theme


def validate_scale(scale: int) -> int:
    """Validate device scale factor is in range 1-4.

    Returns the validated scale value.
    Raises click.BadParameter on invalid input.
    """
    if not (MIN_SCALE <= scale <= MAX_SCALE):
        raise click.BadParameter(
            f"Scale must be between {MIN_SCALE} and {MAX_SCALE}, got {scale}"
        )

    return scale


def validate_wait(wait_ms: int) -> int:
    """Validate wait time is non-negative and bounded.

    Returns the validated wait value.
    Raises click.BadParameter on invalid input.
    """
    if wait_ms < 0:
        raise click.BadParameter(f"Wait time cannot be negative, got {wait_ms}")

    if wait_ms > MAX_WAIT_MS:
        raise click.BadParameter(
            f"Wait time exceeds maximum of {MAX_WAIT_MS}ms, got {wait_ms}"
        )

    return wait_ms


def validate_timeout(timeout_ms: int) -> int:
    """Validate timeout is positive and bounded.

    Returns the validated timeout value.
    Raises click.BadParameter on invalid input.
    """
    if timeout_ms <= 0:
        raise click.BadParameter(f"Timeout must be positive, got {timeout_ms}")

    if timeout_ms > MAX_TIMEOUT_MS:
        raise click.BadParameter(
            f"Timeout exceeds maximum of {MAX_TIMEOUT_MS}ms, got {timeout_ms}"
        )

    return timeout_ms
