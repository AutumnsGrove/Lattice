-- =============================================================================
-- Migration: 008_grove_cli_client
-- Description: Register grove-cli as an OAuth client for device code flow
-- =============================================================================

-- Grove CLI client for device authorization grant
-- No client_secret needed for public clients (CLI tools)
-- Marked as internal service so Google OAuth just sets session cookie
-- (device code flow handles its own token exchange, we just need session for approval)
INSERT INTO clients (
    id,
    name,
    client_id,
    client_secret_hash,
    redirect_uris,
    allowed_origins,
    domain,
    is_internal_service,
    created_at,
    updated_at
) VALUES (
    'grove-cli-001',
    'Grove CLI',
    'grove-cli',
    '',  -- Public client, no secret required for device flow
    '["https://auth-api.grove.place/auth/device"]',  -- Device authorization page
    '[]',  -- No CORS needed for CLI
    NULL,  -- No domain restriction
    1,     -- Internal service: uses session cookie, not OAuth code flow
    datetime('now'),
    datetime('now')
) ON CONFLICT(client_id) DO NOTHING;
