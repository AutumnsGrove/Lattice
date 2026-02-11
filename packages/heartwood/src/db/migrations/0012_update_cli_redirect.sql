-- Migration: Update client redirect URIs from auth-api.grove.place to login.grove.place
-- Part of auth hub migration: all auth traffic now routes through login.grove.place
-- See: packages/engine/src/lib/config/auth.ts (AUTH_HUB_URL)

UPDATE clients
SET redirect_uris = REPLACE(redirect_uris, 'auth-api.grove.place', 'login.grove.place')
WHERE redirect_uris LIKE '%auth-api.grove.place%';
