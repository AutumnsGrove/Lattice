"""Grove app registry for multi-app Glimpse support.

Maps app names to their dev server details so `--app plant` Just Works
without needing a .glimpse.toml override for each app.
"""

from pathlib import Path


# App configurations: name -> (start_cwd relative to grove root, port)
# Port 5173 is the vite default; apps that override it are listed explicitly.
DEFAULT_APP = "aspen"

APP_REGISTRY: dict[str, dict] = {
    "amber": {
        "cwd": "apps/amber",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Amber dashboard",
    },
    "aspen": {
        "cwd": "apps/aspen",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Aspen — tenant sites with subdomain routing (default)",
    },
    "billing": {
        "cwd": "apps/billing",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Billing portal",
    },
    "clearing": {
        "cwd": "apps/clearing",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Clearing house",
    },
    "domains": {
        "cwd": "apps/domains",
        "port": 5174,
        "start_command": "pnpm dev",
        "description": "Domain management",
    },
    "ivy": {
        "cwd": "apps/ivy",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Ivy app",
    },
    "landing": {
        "cwd": "apps/landing",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Landing page (grove.place)",
    },
    "login": {
        "cwd": "apps/login",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Login/auth portal",
    },
    "meadow": {
        "cwd": "apps/meadow",
        "port": 5175,
        "start_command": "pnpm dev",
        "description": "Community meadow",
    },
    "plant": {
        "cwd": "apps/plant",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Plant dashboard (admin)",
    },
    "showroom": {
        "cwd": "tools/showroom",
        "port": 5188,
        "start_command": "pnpm dev",
        "description": "Component showroom for visual audits",
    },
    "terrarium": {
        "cwd": "apps/terrarium",
        "port": 5173,
        "start_command": "pnpm dev",
        "description": "Terrarium dev sandbox",
    },
}

APP_NAMES = sorted(APP_REGISTRY.keys())


def get_app(name: str) -> dict | None:
    """Look up an app by name. Returns None if not found."""
    return APP_REGISTRY.get(name)


def resolve_app_url(app_name: str, path: str = "/") -> str:
    """Build the local dev URL for an app."""
    app = APP_REGISTRY.get(app_name)
    if not app:
        return ""
    port = app["port"]
    return f"http://localhost:{port}{path}"


def list_apps() -> str:
    """Format app list for help text."""
    lines = []
    for name, info in sorted(APP_REGISTRY.items()):
        lines.append(f"  {name:12s} port {info['port']}  {info['description']}")
    return "\n".join(lines)
