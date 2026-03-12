---
title: "Heartwood Developer Guide"
description: "How to integrate with Grove's centralized authentication system."
category: guides
guideCategory: auth
lastUpdated: "2026-03-12"
aliases: []
tags:
  - heartwood
  - auth
  - oauth
  - pkce
  - sessions
---

# Heartwood Developer Guide

> How to integrate with Grove's centralized authentication system.

## What Heartwood Is

Heartwood is Grove's centralized authentication service. It runs as a Cloudflare Worker (`groveauth`) and handles all user identity across the Grove ecosystem. Individual apps never implement their own auth logic. They redirect users to Heartwood, receive verified session tokens back, and validate those tokens on every request.

Authentication methods: Google OAuth (PKCE), magic links (email), and passkeys (WebAuthn).

The public entry point is `login.grove.place`, which proxies all requests to the Heartwood worker via a Cloudflare service binding. The client library lives at `@autumnsgrove/lattice/heartwood`.

## Architecture Overview

The auth flow has three participants: your app, the login hub (`login.grove.place`), and the Heartwood worker (`groveauth`).

```
Your App                    login.grove.place              groveauth (Worker)
  |                               |                              |
  |-- redirect to /login -------->|                              |
  |                               |-- service binding fetch ---->|
  |                               |                              |-- Google/email auth
  |                               |<-- auth code + cookies ------|
  |<-- redirect with session -----|                              |
  |                                                              |
  |-- hooks.server.ts validates session via AUTH binding -------->|
  |<-- { valid: true, user: {...} } -----------------------------|
```

Apps never talk to Heartwood over the public internet. All communication goes through the `AUTH` service binding (Worker-to-Worker), which means zero network latency and no CORS concerns for server-side validation.

Cookies are set on `.grove.place` (with the leading dot), so they're visible to all `*.grove.place` subdomains. This is what makes cross-app session sharing work.

## The Auth Client Library

The client library is at `libs/engine/src/lib/heartwood/`. Import it as `@autumnsgrove/lattice/heartwood`.

### Core modules

| File | Purpose |
|------|---------|
| `client.ts` | `GroveAuthClient` class with PKCE helpers, token exchange, refresh, subscription management |
| `types.ts` | `GroveAuthConfig`, `TokenResponse`, `TokenInfo`, `UserInfo`, subscription types |
| `errors.ts` | `AUTH_ERRORS` catalog with `HW-AUTH-XXX` codes, error mapping from OAuth codes |
| `validation.ts` | TOTP code validation, passkey credential validation, env var helpers |
| `limits.ts` | Post quota helpers (`getQuotaWidgetData`, `getPreSubmitCheck`) |
| `rate-limit.ts` | Client-side rate limiter (first line of defense, not a security boundary) |
| `colors.ts` | Status color utilities for quota UI |

### Creating a client

```typescript
import { createGroveAuthClient } from '@autumnsgrove/lattice/heartwood';

const auth = createGroveAuthClient({
  clientId: 'your-client-id',
  clientSecret: env.GROVEAUTH_CLIENT_SECRET,
  redirectUri: 'https://yourapp.grove.place/auth/callback',
});
```

The `authBaseUrl` defaults to `https://login.grove.place` (defined in `libs/engine/src/lib/config/auth.ts`). You rarely need to override it.

### Generating a login URL

```typescript
const { url, state, codeVerifier } = await auth.getLoginUrl();
// Store state + codeVerifier in a secure cookie, then redirect to url
```

This generates a PKCE code verifier, computes the SHA-256 challenge, and builds the full authorization URL with `client_id`, `redirect_uri`, `state`, `code_challenge`, and `code_challenge_method=S256`.

### Exchanging the code for tokens

```typescript
const tokens = await auth.exchangeCode(code, codeVerifier);
// tokens: { access_token, token_type, expires_in, refresh_token, scope }
```

### Verifying and refreshing tokens

```typescript
// Check if a token is still valid
const info = await auth.verifyToken(accessToken);
// Returns null if inactive, or { active, sub, email, name, exp, ... }

// Check expiry proactively
if (auth.isTokenExpiringSoon(expiresAt, 60)) {
  const newTokens = await auth.refreshToken(refreshToken);
}
```

Token refresh includes automatic retry with exponential backoff (1s, 2s, 4s). It does not retry on 4xx errors.

## How Session Validation Works

Most Grove apps validate sessions the same way: in `hooks.server.ts`, using the `AUTH` service binding to call Heartwood's `/session/validate` endpoint.

### The standard pattern

Every app follows this flow in its server hooks:

1. Look for a session cookie (`grove_session`, `better-auth.session_token`, or `__Secure-better-auth.session_token`)
2. If a cookie exists and the `AUTH` service binding is available, POST to Heartwood's `/session/validate` with the full cookie header
3. If Heartwood responds with `{ valid: true, user: {...} }`, populate `event.locals.user`
4. If validation fails or no cookie exists, `event.locals.user` stays `null`

Here is the core pattern from `apps/landing/src/hooks.server.ts`:

```typescript
const cookieHeader = event.request.headers.get("cookie");

const groveSession = getCookie(cookieHeader, "grove_session");
const betterAuthSession =
  getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
  getCookie(cookieHeader, "better-auth.session_token");
const sessionCookie = groveSession || betterAuthSession;

if (sessionCookie && event.platform?.env?.AUTH) {
  try {
    const response = await event.platform.env.AUTH.fetch(
      "https://login.grove.place/session/validate",
      {
        method: "POST",
        headers: { Cookie: cookieHeader || "" },
      },
    );

    if (response.ok) {
      const data = await response.json();
      if (data.valid && data.user) {
        event.locals.user = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || null,
          is_admin: data.user.isAdmin,
        };
      }
    }
  } catch (err) {
    console.error("[Auth] SessionDO validation error:", err);
  }
}
```

The URL `https://login.grove.place/session/validate` is a routing identifier for the service binding. Traffic goes through the Worker-to-Worker binding, not the public internet.

### Token refresh (legacy D1 sessions)

Some apps (like `apps/domains`) still support legacy D1-based sessions with token refresh. The pattern checks `isTokenExpiringSoon()` and calls `/token/refresh` with the client credentials. New apps should rely on Heartwood's SessionDO and skip the D1 fallback.

## Adding Heartwood Auth to a New App

### 1. Register the client in Heartwood's database

Insert a row into Heartwood's `clients` table with your app's `client_id`, hashed `client_secret`, allowed `redirect_uris`, and allowed `allowed_origins`.

```sql
INSERT INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
  'uuid-here',
  'YourApp',
  'yourapp',
  'hashed-secret-here',
  '["https://yourapp.grove.place/auth/callback"]',
  '["https://yourapp.grove.place"]'
);
```

### 2. Add the AUTH service binding

In your app's `wrangler.toml`:

```toml
[[services]]
binding = "AUTH"
service = "groveauth"
```

### 3. Add environment secrets

Set these via the Cloudflare Dashboard (Pages > Settings > Bindings) or `wrangler secret put`:

- `GROVEAUTH_CLIENT_ID` - your registered client ID
- `GROVEAUTH_CLIENT_SECRET` - your client secret

### 4. Create hooks.server.ts with session validation

Follow the standard pattern from the previous section. Initialize `event.locals.user = null`, check for session cookies, validate via the `AUTH` service binding, and populate `event.locals.user` on success.

Add CSRF validation for state-changing requests:

```typescript
import { validateCSRF } from "@autumnsgrove/lattice/utils";

if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
  if (!validateCSRF(event.request)) {
    throw error(403, "Cross-site request blocked");
  }
}
```

### 5. Declare the user type in app.d.ts

```typescript
declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email: string;
        name: string | null;
        is_admin: boolean;
      } | null;
    }
    interface Platform {
      env?: {
        AUTH?: Fetcher;
        GROVEAUTH_CLIENT_ID?: string;
        GROVEAUTH_CLIENT_SECRET?: string;
      };
    }
  }
}
```

### 6. Set up the login redirect

For most apps, you send users to `login.grove.place` with a `redirect` parameter pointing back to your app:

```typescript
const loginUrl = `https://login.grove.place?redirect=${encodeURIComponent(url.href)}`;
throw redirect(302, loginUrl);
```

The login hub handles the full OAuth/magic link/passkey flow and redirects back to your app with session cookies set on `.grove.place`.

## CSP Considerations

Cross-origin auth requires `connect-src` to include `https://*.grove.place` in your Content-Security-Policy. Without this, browser-side fetch calls to auth endpoints will be blocked.

The standard CSP directive used by Grove apps:

```
connect-src 'self' https://*.grove.place
```

If your app also uses Cloudflare Turnstile or other third-party services, add those origins too. See `apps/landing/src/hooks.server.ts` for a full CSP example that includes `challenges.cloudflare.com`.

The login app itself sets CORS headers for API routes (`/api/auth/*` and `/session/*`) to allow cross-origin requests from any `*.grove.place` subdomain. This is handled in `apps/login/src/hooks.server.ts`.

## Why Things Break

### Redirect loops

The user gets bounced between your app and `login.grove.place` endlessly. This happens when session validation fails on every request, so the app keeps redirecting to login, which redirects back (because the user is already authenticated at Heartwood's level).

Check: Is the `AUTH` service binding configured in `wrangler.toml`? Is the service name `groveauth` spelled correctly? Without the binding, `event.platform.env.AUTH` is `undefined` and session validation is silently skipped.

### Session cookie not visible

Heartwood sets cookies on `.grove.place`. If your app is not on a `*.grove.place` subdomain, the cookie will not be sent by the browser. Custom domains need special handling.

Check: Look at Application > Cookies in browser dev tools. The session cookie should have `Domain: .grove.place`, `Secure: Yes`, `SameSite: Lax`.

### CORS errors on auth endpoints

Browser-side fetch to `login.grove.place` returns a CORS error. This happens when your app's origin is not recognized by the login hub's CORS middleware.

Check: The login hub allows any single-level `*.grove.place` subdomain and localhost. If your origin does not match the regex `^https://[a-z0-9-]+\.grove\.place$`, it will be rejected. Nested subdomains (like `dev.my.grove.place`) are intentionally blocked.

### "Auth service unavailable" (503)

The `AUTH` service binding is not connected. This usually means the `groveauth` worker is not deployed or the binding is misconfigured.

Check: Run `wrangler pages deployment list` to verify the Pages project has the binding. For Workers, check `wrangler deployments list`. The binding name must be `AUTH` and the service must be `groveauth`.

### Token exchange failures (HW-AUTH-023)

The authorization code could not be exchanged for tokens. Common causes: the `client_secret` does not match, the `redirect_uri` does not match what was registered, or the code has expired (codes are single-use and expire in 5 minutes).

Check: Verify `GROVEAUTH_CLIENT_ID` and `GROVEAUTH_CLIENT_SECRET` are set correctly. Verify the `redirect_uri` in your client registration exactly matches what your app sends.

### State mismatch (HW-AUTH-061)

The `state` parameter returned from OAuth does not match what was stored. This is a CSRF protection check. It fails when cookies are blocked, when the user has multiple login tabs open, or when the state cookie expired.

## Key Files

### Login Hub (`apps/login/`)

| File | Purpose |
|------|---------|
| `src/routes/+page.server.ts` | Form actions for Google OAuth and magic link sign-in |
| `src/routes/callback/+server.ts` | Post-auth redirect handler, session cookie presence check |
| `src/routes/session/[...path]/+server.ts` | Session proxy to Heartwood (validate, revoke, list) |
| `src/routes/api/auth/[...path]/+server.ts` | Auth API proxy to Heartwood |
| `src/lib/proxy.ts` | Shared proxy utility with cookie filtering and header allowlists |
| `src/lib/redirect.ts` | Redirect URL validation (only `*.grove.place` allowed) |
| `src/hooks.server.ts` | CORS headers for cross-origin auth, security headers |
| `wrangler.toml` | Service binding: `AUTH = groveauth` |

### Client Library (`libs/engine/src/lib/heartwood/`)

| File | Purpose |
|------|---------|
| `client.ts` | `GroveAuthClient` class, PKCE helpers, all API methods |
| `types.ts` | All TypeScript types, `GroveAuthError` class, tier constants |
| `errors.ts` | `AUTH_ERRORS` catalog (`HW-AUTH-001` through `HW-AUTH-099`) |
| `validation.ts` | TOTP and passkey credential validators |
| `limits.ts` | Post quota helpers for UI components |
| `rate-limit.ts` | Client-side rate limiter |
| `index.ts` | Barrel export (the public API surface) |

### Auth Configuration

| File | Purpose |
|------|---------|
| `libs/engine/src/lib/config/auth.ts` | `AUTH_HUB_URL` constant (`https://login.grove.place`), `authPath()` helper |

### Apps with Session Validation (hooks.server.ts)

| App | Path | Notes |
|-----|------|-------|
| landing | `apps/landing/src/hooks.server.ts` | SessionDO + legacy D1 fallback |
| meadow | `apps/meadow/src/hooks.server.ts` | SessionDO only, tracks `authError` |
| domains | `apps/domains/src/hooks.server.ts` | SessionDO + legacy D1 with token refresh |
| login | `apps/login/src/hooks.server.ts` | CORS only (no session resolution) |
| plant | `apps/plant/src/hooks.server.ts` | CSRF only (no session resolution) |

### Service Binding Configuration

All apps that validate sessions need the `AUTH` service binding in their `wrangler.toml`:

```toml
[[services]]
binding = "AUTH"
service = "groveauth"
```

Apps with this binding: landing, meadow, domains, login, plant, amber, ivy, and the engine itself.

## Quick Checklist

When adding Heartwood auth to a new Grove app:

- [ ] Register client in Heartwood's `clients` table (client_id, secret, redirect_uris, origins)
- [ ] Add `[[services]]` binding in `wrangler.toml` (binding = "AUTH", service = "groveauth")
- [ ] Set `GROVEAUTH_CLIENT_ID` and `GROVEAUTH_CLIENT_SECRET` secrets
- [ ] Create `hooks.server.ts` with the session validation pattern
- [ ] Declare `App.Locals` and `App.Platform` types in `app.d.ts`
- [ ] Add `connect-src 'self' https://*.grove.place` to your CSP
- [ ] Add CSRF validation for POST/PUT/DELETE/PATCH methods
- [ ] Set up login redirect to `login.grove.place?redirect=...`
- [ ] Test: sign in via Google, verify `event.locals.user` is populated
- [ ] Test: sign out, verify `event.locals.user` is null

## Error Code Reference

Heartwood uses structured error codes in the format `HW-AUTH-XXX`. Each error has a category that determines how to handle it:

| Range | Category | Meaning |
|-------|----------|---------|
| 001-019 | OAuth provider errors | Google returned an error, user cancelled, scope issues |
| 020-039 | Session/token errors | Expired sessions, invalid tokens, exchange failures |
| 040-059 | Client config errors | Unregistered client, invalid secret, origin mismatch |
| 060-079 | Rate limiting/security | Too many attempts, CSRF mismatch |
| 080-099 | Internal errors | Server errors, unknown failures |

Error categories: `user` (they can fix it), `admin` (config issue, contact support), `bug` (internal, needs investigation).

Use `getAuthError(oauthErrorCode)` to map OAuth error strings to Heartwood error definitions, and `buildErrorParams(error)` to create redirect URL parameters for the login page.

## Further Reading

- **Heartwood spec**: `docs/specs/heartwood-spec.md` (full API specification, database schema, security requirements)
- **Local auth testing**: `docs/guides/local-auth-testing.md` (Cloudflare Tunnel setup for testing Google OAuth locally)
- **Login hub security audit**: `docs/security/hawk-report-2026-02-10-login-auth-hub.md` (HAWK-005/006/007 hardening)
- **Auth URL config**: `libs/engine/src/lib/config/auth.ts` (single source of truth for `AUTH_HUB_URL`)

---

_Last updated: 2026-03-12_
