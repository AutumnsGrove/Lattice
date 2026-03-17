"""Mock authentication for Glimpse visual testing.

Provides simulated auth sessions via the x-grove-dev-auth header so
Glimpse can screenshot authenticated pages (arbor, settings, etc.)
without requiring Heartwood to be running.

The header carries a JSON user object that hooks.server.ts accepts
on localhost only — same trust model as the x-subdomain header.

Preset personas match the seed data profiles:
  - owner: Tenant owner for midnight-bloom (example@grove.place)
  - admin: Platform admin with full access
  - wanderer: Logged-in non-owner user (read-only visitor)
"""

import json


# Preset personas keyed by name.
# "owner" matches the midnight-bloom seed tenant (migration 010).
PERSONAS: dict[str, dict] = {
    "owner": {
        "id": "glimpse-owner-001",
        "email": "example@grove.place",
        "name": "Midnight Bloom Owner",
        "picture": "",
        "isAdmin": False,
    },
    "admin": {
        "id": "glimpse-admin-001",
        "email": "admin@grove.place",
        "name": "Grove Admin",
        "picture": "",
        "isAdmin": True,
    },
    "wanderer": {
        "id": "glimpse-wanderer-001",
        "email": "wanderer@grove.place",
        "name": "Curious Wanderer",
        "picture": "",
        "isAdmin": False,
    },
}

PERSONA_NAMES = sorted(PERSONAS.keys())
DEFAULT_PERSONA = "owner"


def build_auth_header(persona: str | None = None) -> dict[str, str]:
    """Build extra HTTP headers for mock auth.

    Args:
        persona: Persona name ("owner", "admin", "wanderer") or None
                 for default (owner). Case-insensitive.

    Returns:
        Dict with x-grove-dev-auth header set to JSON user data.

    Raises:
        ValueError: If persona name is not recognized.
    """
    name = (persona or DEFAULT_PERSONA).lower()
    user = PERSONAS.get(name)
    if not user:
        raise ValueError(
            f"Unknown persona '{name}'. Available: {', '.join(PERSONA_NAMES)}"
        )
    return {"x-grove-dev-auth": json.dumps(user)}
