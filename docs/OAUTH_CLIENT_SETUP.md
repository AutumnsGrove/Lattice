# Setting Up a New OAuth Client for GroveAuth

This guide walks through registering a new website/application as an OAuth client with GroveAuth.

## Prerequisites

- `wrangler` CLI installed and logged in
- Access to both the client site and GroveAuth database

## Step 1: Generate a Client Secret

Generate a secure random secret:

```bash
openssl rand -base64 32
```

Save this value - you'll need it in steps 2 and 3.

**Example output:** `FhptwFIyRjxOtMwT6f/FPmRHSMOF2Fgitjx/eLuAvv0=`

## Step 2: Set Secrets on the Client Site

For **Pages projects** (SvelteKit, Next.js, etc.):

```bash
# Set the client ID (use a simple identifier like 'domains', 'blog', etc.)
echo "your-client-id" | wrangler pages secret put GROVEAUTH_CLIENT_ID --project your-project-name

# Set the client secret (the value from step 1)
echo "your-secret-from-step-1" | wrangler pages secret put GROVEAUTH_CLIENT_SECRET --project your-project-name
```

For **Workers projects**:

```bash
cd your-worker-directory
echo "your-client-id" | wrangler secret put GROVEAUTH_CLIENT_ID
echo "your-secret-from-step-1" | wrangler secret put GROVEAUTH_CLIENT_SECRET
```

## Step 3: Generate the Secret Hash

GroveAuth stores a **hash** of the secret, not the plaintext. Generate the SHA-256 hash:

```bash
echo -n "your-secret-from-step-1" | openssl dgst -sha256
```

**Example output:** `ef5434f07f4bd50a8ae4ade17629cd06d31382303d4c426ea10d0d17874d4895`

Copy just the hash value (after `SHA2-256= `).

## Step 4: Register the Client in GroveAuth

Insert the client into the GroveAuth database:

```bash
wrangler d1 execute groveauth --remote --command="
INSERT INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
  'unique-client-id',           -- Unique identifier (e.g., 'myblog-grove-place')
  'Human Readable Name',        -- Display name (e.g., 'My Blog')
  'client-id-from-step-2',      -- Must match GROVEAUTH_CLIENT_ID
  'hash-from-step-3',           -- SHA-256 hash of the secret
  '[\"https://yoursite.com/auth/callback\", \"http://localhost:5173/auth/callback\"]',
  '[\"https://yoursite.com\", \"http://localhost:5173\"]'
)
ON CONFLICT(client_id) DO UPDATE SET
  client_secret_hash = excluded.client_secret_hash,
  redirect_uris = excluded.redirect_uris,
  allowed_origins = excluded.allowed_origins;
"
```

**Important fields:**
- `redirect_uris`: Where GroveAuth can redirect after login (include localhost for dev)
- `allowed_origins`: CORS origins that can make requests to GroveAuth

## Step 5: Update wrangler.toml

Add the GroveAuth URL to your site's `wrangler.toml`:

```toml
[vars]
GROVEAUTH_URL = "https://auth.grove.place"
```

Also update the secrets comment for documentation:

```toml
# Secrets (configured via wrangler pages secret):
# - GROVEAUTH_CLIENT_ID (OAuth client ID)
# - GROVEAUTH_CLIENT_SECRET (OAuth client secret)
```

## Step 6: Deploy and Test

1. Deploy your site:
   ```bash
   pnpm deploy
   ```

2. Test the login flow:
   - Navigate to `https://yoursite.com/auth/login`
   - Should redirect to `https://auth.grove.place/login`
   - After authentication, should redirect back to `/auth/callback`
   - Should create session and redirect to your app

## Troubleshooting

### "Invalid client" error
- Verify `GROVEAUTH_CLIENT_ID` matches `client_id` in the database
- Check the secret hash was generated correctly (use `echo -n` to avoid newline)

### "Invalid redirect URI" error
- Ensure the callback URL is in the `redirect_uris` array in the database
- Check for trailing slashes - they must match exactly

### "CORS error"
- Add your domain to `allowed_origins` in the database
- Include both production and localhost URLs

## Quick Reference

| Step | Command |
|------|---------|
| Generate secret | `openssl rand -base64 32` |
| Set client ID | `echo "id" \| wrangler pages secret put GROVEAUTH_CLIENT_ID --project name` |
| Set client secret | `echo "secret" \| wrangler pages secret put GROVEAUTH_CLIENT_SECRET --project name` |
| Generate hash | `echo -n "secret" \| openssl dgst -sha256` |
| Register client | `wrangler d1 execute groveauth --remote --command="INSERT INTO clients..."` |

---

*Last updated: 2025-12-08*
