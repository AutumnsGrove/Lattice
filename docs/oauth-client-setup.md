# Setting Up a New OAuth Client for GroveAuth

This guide walks through registering a new website/application as an OAuth client with GroveAuth.

## Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **API** (Worker) | `https://auth-api.grove.place` | Token exchange, verification, refresh |
| **Frontend** (Pages) | `https://auth.grove.place` | Login UI, OAuth redirects |

**Your client code should call `auth-api.grove.place`** for all API operations (token exchange, verify, refresh, logout).

## Prerequisites

- `wrangler` CLI installed and logged in
- Access to both the client site and GroveAuth database

## Step 1: Generate a Client Secret

Generate a secure random secret:

```bash
CLIENT_SECRET=$(openssl rand -base64 32)
echo "Client Secret: $CLIENT_SECRET"
```

Save this value - you'll need it in steps 2 and 3.

**Example output:** `rr5lBktONMqrjhwGYztagnWxZi9yn/VgQlKH2xLAhR0=`

## Step 2: Set Secrets on the Client Site

For **Pages projects** (SvelteKit, Next.js, etc.):

```bash
# Set the client ID (use a simple identifier like 'domains', 'blog', etc.)
echo "your-client-id" | wrangler pages secret put GROVEAUTH_CLIENT_ID --project your-project-name

# Set the client secret (the value from step 1)
echo "your-secret-from-step-1" | wrangler pages secret put GROVEAUTH_CLIENT_SECRET --project your-project-name

# Set the redirect URI
echo "https://yoursite.com/auth/callback" | wrangler pages secret put GROVEAUTH_REDIRECT_URI --project your-project-name
```

For **Workers projects**:

```bash
cd your-worker-directory
echo "your-client-id" | wrangler secret put GROVEAUTH_CLIENT_ID
echo "your-secret-from-step-1" | wrangler secret put GROVEAUTH_CLIENT_SECRET
echo "https://yoursite.com/auth/callback" | wrangler secret put GROVEAUTH_REDIRECT_URI
```

## Step 3: Generate the Secret Hash (Base64URL Format)

**CRITICAL**: GroveAuth uses **base64url encoding** (with `-` and `_`, no padding), NOT standard base64 or hex!

Generate the SHA-256 hash in the correct format:

```bash
# Replace with your actual secret from step 1
CLIENT_SECRET="your-secret-from-step-1"

# Generate base64url-encoded SHA-256 hash (GroveAuth format)
CLIENT_SECRET_HASH=$(echo -n "$CLIENT_SECRET" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')
echo "Hash for database: $CLIENT_SECRET_HASH"
```

**Example:**
- Secret: `rr5lBktONMqrjhwGYztagnWxZi9yn/VgQlKH2xLAhR0=`
- Hash: `Sdgtaokie8-H7GKw-tn0S_6XNSh1rdv_lP8wCfe7_6E`

### Hash Format Comparison (DON'T USE THE WRONG ONE!)

| Format | Example | Use in GroveAuth? |
|--------|---------|-------------------|
| **base64url (correct)** | `Sdgtaokie8-H7GKw-tn0S_6XNSh1rdv_lP8wCfe7_6E` | ✅ YES |
| base64 (wrong) | `Sdgtaokie8+H7GKw+tn0S/6XNSh1rdv/lP8wCfe7/6E=` | ❌ NO |
| hex (wrong) | `49d82d6a89227bcf87ec62b0fad9f44b...` | ❌ NO |

## Step 4: Register the Client in GroveAuth

Insert the client into the GroveAuth database:

```bash
wrangler d1 execute groveauth --remote --command="
INSERT INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
  'unique-uuid-here',             -- Unique identifier (use: uuidgen)
  'Human Readable Name',          -- Display name (e.g., 'My Blog')
  'client-id-from-step-2',        -- Must match GROVEAUTH_CLIENT_ID
  'base64url-hash-from-step-3',   -- SHA-256 hash in BASE64URL format!
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
- `client_secret_hash`: Must be **base64url encoded** (dashes, underscores, no padding)

## Step 5: Update wrangler.toml (Optional)

Add documentation comments to your site's `wrangler.toml`:

```toml
# GroveAuth Secrets (configured via wrangler pages secret):
# - GROVEAUTH_CLIENT_ID (OAuth client ID)
# - GROVEAUTH_CLIENT_SECRET (OAuth client secret - plaintext)
# - GROVEAUTH_REDIRECT_URI (OAuth callback URL)
```

## Step 6: Deploy and Test

1. Deploy your site (or it will auto-deploy on push)

2. Test the login flow:
   - Navigate to `https://yoursite.com/admin` (or protected route)
   - Should redirect to `https://auth.grove.place/login`
   - Choose Google, GitHub, or Magic Code authentication
   - After authentication, should redirect back to `/auth/callback`
   - Should create session and redirect to your app

## Complete One-Liner Script

For convenience, here's a complete script to generate everything:

```bash
#!/bin/bash
# Generate GroveAuth client credentials

CLIENT_ID="your-client-id"
PROJECT_NAME="your-pages-project"
SITE_URL="https://yoursite.com"

# Generate secret
CLIENT_SECRET=$(openssl rand -base64 32)

# Generate hash (base64url format - CRITICAL!)
CLIENT_SECRET_HASH=$(echo -n "$CLIENT_SECRET" | openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')

echo "=================================="
echo "GroveAuth Client Credentials"
echo "=================================="
echo ""
echo "Client ID:     $CLIENT_ID"
echo "Client Secret: $CLIENT_SECRET"
echo "Secret Hash:   $CLIENT_SECRET_HASH"
echo "Redirect URI:  $SITE_URL/auth/callback"
echo ""
echo "=================================="
echo "Run these commands:"
echo "=================================="
echo ""
echo "# 1. Set secrets on client site:"
echo "echo \"$CLIENT_ID\" | wrangler pages secret put GROVEAUTH_CLIENT_ID --project $PROJECT_NAME"
echo "echo \"$CLIENT_SECRET\" | wrangler pages secret put GROVEAUTH_CLIENT_SECRET --project $PROJECT_NAME"
echo "echo \"$SITE_URL/auth/callback\" | wrangler pages secret put GROVEAUTH_REDIRECT_URI --project $PROJECT_NAME"
echo ""
echo "# 2. Register in GroveAuth (update the SQL with your details):"
echo "wrangler d1 execute groveauth --remote --command=\"INSERT INTO clients ...\""
```

## Troubleshooting

### "Invalid client credentials" error (401)
This is almost always a **hash format mismatch**:
- ✅ Correct: base64url with `-` and `_`, NO padding (`=`)
- ❌ Wrong: base64 with `+` and `/`, WITH padding
- ❌ Wrong: hex format

Regenerate the hash using the exact command in Step 3.

### "Invalid client" error
- Verify `GROVEAUTH_CLIENT_ID` matches `client_id` in the database exactly

### "Invalid redirect URI" error
- Ensure the callback URL is in the `redirect_uris` array in the database
- Check for trailing slashes - they must match exactly
- Include the full URL with protocol (`https://`)

### "CORS error"
- Add your domain to `allowed_origins` in the database
- Include both production and localhost URLs

### "Code verifier required" error
- The client isn't sending PKCE parameters correctly
- Check that `code_verifier` cookie is being set and retrieved

## Quick Reference

| Step | Command |
|------|---------|
| Generate secret | `openssl rand -base64 32` |
| Generate hash (base64url) | `echo -n "secret" \| openssl dgst -sha256 -binary \| base64 \| tr '+/' '-_' \| tr -d '='` |
| Set client ID | `echo "id" \| wrangler pages secret put GROVEAUTH_CLIENT_ID --project name` |
| Set client secret | `echo "secret" \| wrangler pages secret put GROVEAUTH_CLIENT_SECRET --project name` |
| Set redirect URI | `echo "url" \| wrangler pages secret put GROVEAUTH_REDIRECT_URI --project name` |
| Register client | `wrangler d1 execute groveauth --remote --command="INSERT INTO clients..."` |
| List secrets | `wrangler pages secret list --project name` |

---

*Last updated: 2025-12-08*
