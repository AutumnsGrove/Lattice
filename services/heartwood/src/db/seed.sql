-- GroveAuth Seed Data
-- Initial clients and allowed emails

-- GroveEngine client (internal sites on *.grove.place)
INSERT OR REPLACE INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
    'c1000000-0000-0000-0000-000000000001',
    'GroveEngine',
    'groveengine',
    '452YpWplVAcb3UxXzBtGfSAY6KjN1JBl8PQvPYBpu1E',
    '["https://grove.place/auth/callback", "https://admin.grove.place/auth/callback", "https://admin.grove.place/callback", "https://forage.grove.place/auth/callback", "https://domains.grove.place/auth/callback"]',
    '["https://grove.place", "https://admin.grove.place", "https://forage.grove.place", "https://domains.grove.place"]'
);

-- AutumnsGrove client (main site - autumnsgrove.com)
INSERT OR REPLACE INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
    'c2000000-0000-0000-0000-000000000002',
    'AutumnsGrove',
    'autumnsgrove',
    'CfHJBZwJmFy0eXNx9vRUZAvXj673ePuuIGhX3IyJEik=',
    '["https://autumnsgrove.com/auth/callback"]',
    '["https://autumnsgrove.com"]'
);

-- Amber client (Grove storage management - amber.grove.place)
INSERT OR REPLACE INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
    'c3000000-0000-0000-0000-000000000003',
    'Amber',
    'amber',
    'lO8UBoFJKFkyTKvyoBp-LAyAzrC5j2kg4lQmkxKq5Vc',
    '["https://amber.grove.place/auth/callback"]',
    '["https://amber.grove.place", "https://amber-api.grove.place"]'
);

-- Plant client (tenant onboarding - plant.grove.place)
INSERT OR REPLACE INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
    'c4000000-0000-0000-0000-000000000004',
    'Plant',
    'grove-plant',
    'sSqlPr1D6qdmpz2WkCz0tDmw8-60SaE0zDCuWvAdpFI',
    '["https://plant.grove.place/auth/callback", "https://grove-plant.pages.dev/auth/callback"]',
    '["https://plant.grove.place", "https://grove-plant.pages.dev"]'
);

-- Initial allowed admin email
INSERT OR REPLACE INTO allowed_emails (email, added_by)
VALUES ('autumnbrown23@pm.me', 'system_seed');
