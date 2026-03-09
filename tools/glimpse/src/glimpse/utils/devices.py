"""Named device presets for common viewport sizes.

Use with --device flag on capture/matrix/browse commands to
quickly target mobile, tablet, or desktop viewports without
remembering exact pixel dimensions.
"""


DEVICES: dict[str, dict[str, int]] = {
    # ── Phones ──
    "iphone-se": {"width": 375, "height": 667, "scale": 2},
    "iphone": {"width": 390, "height": 844, "scale": 3},
    "iphone-pro": {"width": 393, "height": 852, "scale": 3},
    "iphone-pro-max": {"width": 430, "height": 932, "scale": 3},
    "pixel": {"width": 412, "height": 915, "scale": 2},
    "galaxy": {"width": 360, "height": 800, "scale": 3},

    # ── Tablets ──
    "ipad": {"width": 820, "height": 1180, "scale": 2},
    "ipad-pro": {"width": 1024, "height": 1366, "scale": 2},
    "tablet": {"width": 768, "height": 1024, "scale": 2},

    # ── Desktop ──
    "laptop": {"width": 1366, "height": 768, "scale": 1},
    "desktop": {"width": 1920, "height": 1080, "scale": 1},
    "desktop-hd": {"width": 2560, "height": 1440, "scale": 1},
    "ultrawide": {"width": 3440, "height": 1440, "scale": 1},
}

# Aliases for convenience
DEVICES["mobile"] = DEVICES["iphone"]
DEVICES["phone"] = DEVICES["iphone"]

DEVICE_NAMES = sorted(DEVICES.keys())


def get_device(name: str) -> dict[str, int] | None:
    """Look up a device preset by name (case-insensitive).

    Returns dict with width, height, scale, or None if not found.
    """
    return DEVICES.get(name.lower())


def list_devices() -> list[tuple[str, int, int, int]]:
    """Return all device presets as (name, width, height, scale) tuples."""
    return [
        (name, d["width"], d["height"], d["scale"])
        for name, d in sorted(DEVICES.items())
    ]
