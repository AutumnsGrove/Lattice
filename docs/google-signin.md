# Google Sign-In Implementation Guide

> **Internal Codename**: Scout (Research Goblin)  
> **Product URL**: scout.grove.place  
> **Tech Stack**: SvelteKit, Cloudflare Workers, D1, KV, OAuth 2.0 with PKCE

## Overview

Scout implements a secure, production‑ready Google Sign‑In flow that:

- Uses **OAuth 2.0 with PKCE** (Proof Key for Code Exchange) for enhanced security
- Stores sessions in **Cloudflare KV** with 7‑day TTL
- Creates user records in **D1 SQLite** with provider‑based authentication
- Supports **secure redirect validation** to prevent open‑redirect attacks
- Includes **CSRF protection** via one‑time state tokens
- Sends **welcome emails** to new users via Resend
- Tracks **analytics events** for sign‑ups and logins

This guide explains the architecture, code structure, and steps to replicate the implementation in other projects.

---

## Architecture

### Flow Diagram

```
1. User clicks "Continue with Google" → `/api/auth/google?redirect=/dashboard`
2. Server generates PKCE verifier/challenge, creates CSRF state, stores in KV
3. Redirect to Google OAuth with `state`, `code_challenge`, `client_id`, etc.
4. Google authenticates user, redirects to `/api/auth/callback` with `code` and `state`
5. Server validates `state`, exchanges `code` for tokens using PKCE verifier
6. Fetches user info (email, name, ID) from Google API
7. Creates or retrieves user in D1, creates session in KV
8. Sets HttpOnly Secure cookie with session ID
9. Redirects to original destination (or profile for new users)
```

### Security Features

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **PKCE** | `S256` code challenge/verifier | Prevents authorization‑code interception attacks |
| **CSRF Protection** | Random state token stored in KV (one‑time use) | Prevents cross‑site request forgery |
| **Secure Cookies** | `HttpOnly`, `Secure`, `SameSite=Lax` | Mitigates XSS and CSRF for session management |
| **Redirect Validation** | `validateRedirectUrl()` allows only relative paths | Blocks open‑redirect attacks |
| **Error Obfuscation** | Generic error messages in client | Prevents information leakage |
| **Session Storage** | KV with 7‑day TTL, auto‑cleanup | Server‑side sessions avoid client‑side tampering |

---

## Setup Instructions

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - Development: `http://localhost:5173/api/auth/callback`
   - Production: `https://scout.grove.place/api/auth/callback`
7. Copy **Client ID** and **Client Secret**

### 2. Cloudflare Secrets

Set the following secrets via `wrangler secret put`:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

### 3. Database Schema

Ensure your `users` table includes:

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    auth_provider TEXT NOT NULL,
    auth_provider_id TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(auth_provider, auth_provider_id)
);
```

### 4. KV Namespace

Create a KV namespace for sessions and OAuth state:

```bash
npx wrangler kv:namespace create SCOUT_CACHE
```

Add binding to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "KV"
id = "your-namespace-id"
```

---

## Code Walkthrough

### File Structure

```
src/
├── routes/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── google/
│   │   │   │   └── +server.ts        # OAuth initiation
│   │   │   └── callback/
│   │   │       └── +server.ts        # OAuth callback handler
│   ├── auth/
│   │   └── login/
│   │       └── +page.svelte          # Login UI with Google button
├── lib/
│   └── server/
│       ├── auth.ts                   # Core auth utilities
│       └── db.ts                     # Database operations
```

### 1. Login UI (`src/routes/auth/login/+page.svelte`)

- Simple, clean button with Google logo
- Passes `redirect` parameter to preserve destination
- Error display for OAuth failures

```svelte
<a href="/api/auth/google?redirect={encodeURIComponent(redirect)}"
   class="...">
   <svg>Google logo</svg>
   Continue with Google
</a>
```

### 2. OAuth Initiation (`src/routes/api/auth/google/+server.ts`)

- Generates PKCE verifier and challenge
- Creates CSRF state with verifier stored in KV
- Builds Google OAuth URL with `code_challenge`
- Redirects to Google

Key functions:
- `generatePKCE()` – creates verifier/challenge pair
- `createOAuthState()` – stores state in KV with TTL
- `getGoogleAuthUrl()` – constructs authorization URL

### 3. OAuth Callback (`src/routes/api/auth/callback/+server.ts`)

- Validates `state` against KV (one‑time use)
- Exchanges `code` for tokens using PKCE verifier
- Fetches user info from Google API
- Calls `handleOAuthCallback()` to create/retrieve user and session
- Sets session cookie
- Sends welcome email for new users
- Redirects to validated destination

### 4. Auth Utilities (`src/lib/server/auth.ts`)

#### PKCE Generation

```typescript
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  // 32‑byte random verifier, base64url‑encoded
  // SHA‑256 hash → base64url challenge
}
```

#### State Management

```typescript
export async function createOAuthState(
  kv: KVNamespace,
  redirectTo: string,
  codeVerifier?: string
): Promise<string> {
  // Stores { redirect_to, csrf_token, code_verifier } in KV
  // Returns CSRF token used as `state` parameter
}
```

#### Google OAuth Helpers

- `getGoogleAuthUrl()` – builds authorization URL with PKCE params
- `exchangeGoogleCode()` – exchanges code for tokens (with verifier)
- `getGoogleUserInfo()` – fetches user profile

#### Session Management

- `createSession()` – stores session in KV with TTL
- `createSessionCookie()` – builds `Set‑Cookie` header
- `getSession()` / `deleteSession()` – session CRUD

#### Security Helpers

- `validateRedirectUrl()` – ensures redirects are relative and safe
- `generateSessionId()` – cryptographically random session IDs

### 5. Database Integration (`src/lib/server/db.ts`)

- `getUserByProvider()` – finds user by `auth_provider` + `auth_provider_id`
- `createUser()` – inserts new user record
- `createProfile()` – creates associated profile

### 6. User Flow (`handleOAuthCallback`)

```typescript
const { user, session, isNewUser } = await handleOAuthCallback(
  db, kv, 'google', providerId, email, displayName
);
```

- If user exists → create session
- If new user → create user + profile, send welcome email, track sign‑up event
- Returns session for cookie setting

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | `123456‑*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | `GOCSPX‑...` |
| `SITE_URL` | Base URL for redirects | `https://scout.grove.place` |
| `ENVIRONMENT` | `development` / `production` | `production` |
| `RESEND_API_KEY` | For welcome emails | `re_...` |

---

## Error Handling

### Client‑Facing Errors

All errors are mapped to generic messages to avoid information leakage:

```typescript
const errorMessages: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  invalid_state: 'Session expired. Please try again.',
  missing_params: 'Missing authentication parameters.',
  no_email: 'Could not retrieve your email address.',
};
```

### Server‑Side Logging

Detailed errors are logged server‑side but not exposed:

```typescript
try {
  // OAuth exchange
} catch (err) {
  console.error('OAuth callback error', err);
  throw redirect(302, '/auth/login?error=auth_failed');
}
```

---

## Testing Considerations

### Local Development

1. Set `ENVIRONMENT=development` and `SITE_URL=http://localhost:5173`
2. Use Google Cloud credentials with local redirect URI
3. KV and D1 are emulated via `wrangler dev`

### Integration Tests

- Mock Google OAuth endpoints (e.g., using `MSW`)
- Test PKCE flow with dummy verifier/challenge
- Verify session creation and cookie setting

### Security Tests

- Attempt open redirect with `redirect=http://evil.com`
- Replay state token (should be one‑time use)
- Try to bypass PKCE (should fail)

---

## Common Pitfalls & Solutions

| Problem | Solution |
|---------|----------|
| **Invalid redirect URI** | Ensure exact match in Google Cloud Console (including trailing slash?) |
| **PKCE mismatch** | Verify `code_verifier` is stored in state and passed to token exchange |
| **CSRF token reuse** | State is deleted from KV after first read (`getOAuthStateWithPKCE`) |
| **Cookie not set** | Check `Secure` flag in production (requires HTTPS) |
| **User email missing** | Google scope must include `email` and `profile` |

---

## Extending to Other Providers

The architecture is designed for multi‑provider support:

1. **Apple Sign‑In** – already implemented in `auth.ts` (see `apple` functions)
2. **GitHub, Facebook, etc.** – follow the same pattern:
   - Add provider‑specific auth URL builder
   - Add token‑exchange function
   - Add user‑info fetcher
   - Reuse `handleOAuthCallback` for DB operations

Example for GitHub:

```typescript
export function getGitHubAuthUrl(clientId: string, redirectUri: string, state: string) {
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=user:email`;
}
```

---

## Deployment Checklist

- [ ] Google Cloud OAuth credentials configured
- [ ] Redirect URIs added for production domain
- [ ] Secrets set via `wrangler secret put`
- [ ] KV namespace created and bound
- [ ] Database migrations applied
- [ ] `SITE_URL` updated in `wrangler.toml`
- [ ] Cookie `Secure` flag enabled in production
- [ ] Welcome email template ready (if using Resend)

---

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [RFC 7636 – PKCE](https://tools.ietf.org/html/rfc7636)
- [Cloudflare Workers KV](https://developers.cloudflare.com/kv/)
- [SvelteKit Authentication](https://kit.svelte.dev/docs/security#authentication)

---

## Credits

**Scout Team** – Internal codename *Research Goblin*  
**Implementation Date**: 2025‑11‑28  
**Last Updated**: 2025‑12‑07  
**Model**: Claude Sonnet 4.5

> *“Slick as shit” – Product Lead*