---
title: "Local Auth Testing with Cloudflare Tunnel"
status: planned
category: infra
---

# Local Auth Testing with Cloudflare Tunnel

Testing Grove's OAuth flow locally requires a publicly accessible domain that Google Console recognizes. This plan uses Cloudflare Tunnel to expose localhost to the internet under a stable subdomain.

**Status: Implemented** (2026-02-06)

## Quick Start

```bash
# First time only
brew install cloudflared
cloudflared login
./scripts/dev-tunnel.sh setup

# Copy env file and uncomment VITE_AUTH_API_URL
cp apps/landing/.env.local.example apps/landing/.env.local

# Day-to-day: two terminals
./scripts/dev-tunnel.sh              # Terminal 1: tunnel
cd packages/landing && bun run dev   # Terminal 2: dev server

# Visit https://dev.grove.place
```

## 1. Prerequisites

- Cloudflare account (autumnsgrove) already exists
- cloudflared CLI installed locally:
  ```bash
  brew install cloudflared
  ```
- One-time login:
  ```bash
  cloudflared login
  ```

## 2. Tunnel Setup

The `scripts/dev-tunnel.sh` script handles all of this automatically:

```bash
./scripts/dev-tunnel.sh setup    # Creates tunnel, config, DNS
./scripts/dev-tunnel.sh status   # Check if everything is ready
./scripts/dev-tunnel.sh          # Start the tunnel
```

### What Setup Does

1. Creates a named tunnel `grove-dev` (persists across sessions)
2. Writes config to `~/.cloudflared/config-grove-dev.yml`
3. Creates a DNS CNAME for `dev.grove.place` pointing to the tunnel

### Manual Setup (if needed)

```bash
cloudflared tunnel create grove-dev
cloudflared tunnel route dns grove-dev dev.grove.place
```

Config at `~/.cloudflared/config-grove-dev.yml`:

```yaml
tunnel: <tunnel-uuid>
credentials-file: ~/.cloudflared/<tunnel-uuid>.json

ingress:
  - hostname: dev.grove.place
    service: http://localhost:5173
  - service: http_status:404
```

## 3. Google Console Changes (One-Time)

Add OAuth redirect URI for local development:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Grove project
2. APIs & Services → Credentials → OAuth 2.0 Client IDs
3. Edit the Client ID used by Grove
4. Add authorized redirect URI:
   ```
   https://dev.grove.place/api/auth/callback/google
   ```
5. Save changes

## 4. Code Changes (Completed)

### A. Environment-Aware Auth URLs

`libs/engine/src/lib/grafts/login/config.ts` now reads `VITE_AUTH_API_URL`:

```typescript
const AUTH_API_BASE =
  import.meta.env.VITE_AUTH_API_URL ?? "https://auth-api.grove.place";

export const GROVEAUTH_URLS = {
  api: AUTH_API_BASE,
  socialSignIn: `${AUTH_API_BASE}/api/auth/sign-in/social`,
  magicLink: `${AUTH_API_BASE}/api/auth/sign-in/magic-link`,
};
```

Set in `apps/landing/.env.local`:
```
VITE_AUTH_API_URL=https://dev.grove.place
```

An example file is provided at `apps/landing/.env.local.example`.

### B. Trusted Origins — No Changes Needed

Heartwood already uses `https://*.grove.place` wildcard in `trustedOrigins`, which covers `dev.grove.place`. Verified in `services/heartwood/src/auth/index.ts:113`.

### C. Cookie Domain — No Changes Needed

The cookie domain `.grove.place` (with leading dot) already covers all subdomains including `dev.grove.place`. Verified in both:
- `services/heartwood/src/auth/index.ts:157` (Better Auth cross-subdomain config)
- `libs/engine/src/lib/grafts/login/server/origin.ts:77` (getCookieDomain)

### D. CORS — No Changes Needed

The `isGroveSubdomain()` function in `services/heartwood/src/middleware/cors.ts:52` already allows any `*.grove.place` HTTPS origin.

### E. LoginGraft — No Changes Needed

`LoginGraft.svelte` imports `GROVEAUTH_URLS` from `config.ts`, which now respects the env var. The callback URL is constructed from `window.location.origin` (which will be `https://dev.grove.place` through the tunnel), so it works automatically.

### F. GroveAuthClient — No Changes Needed

The server-side `GroveAuthClient` accepts `authBaseUrl` via constructor config, and Workers communicate with Heartwood via service bindings (`platform.env.AUTH.fetch()`), not public URLs.

## 5. Day-to-Day Usage

### Start the Tunnel

```bash
./scripts/dev-tunnel.sh
```

### Start Local Dev

In another terminal:
```bash
cd packages/landing && bun run dev
```

### Test the Flow

1. Open `https://dev.grove.place` in browser
2. Click login → Google OAuth button
3. You'll be redirected to Google login, then back to `dev.grove.place`
4. Should land back at dev.grove.place authenticated

### Custom Port

```bash
DEV_PORT=3000 ./scripts/dev-tunnel.sh
```

## 6. Alternative: Heartwood Local Testing

For auth code changes, run Heartwood locally too:

```bash
cd packages/heartwood && wrangler dev --local
```

Update the tunnel config (`~/.cloudflared/config-grove-dev.yml`) to split routing:

```yaml
ingress:
  - hostname: dev.grove.place
    path: /api/auth/*
    service: http://localhost:8787
  - hostname: dev.grove.place
    service: http://localhost:5173
  - service: http_status:404
```

Then restart the tunnel. More complex but valuable when actively developing auth.

## 7. Security Notes

- **Credentials**: `~/.cloudflared/` contains tunnel auth tokens — keep it secure
- **Public access**: `dev.grove.place` is accessible to anyone while the tunnel runs. For isolation, use Cloudflare Access policies or only run the tunnel during testing
- **Cleanup**: Stop the tunnel when not in use (`Ctrl+C`)
- **Google Console**: The dev redirect URI is safe to leave configured permanently

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| Tunnel fails to connect | Verify `cloudflared login` was run; check `cloudflared tunnel list` |
| dev.grove.place times out | Check tunnel is running; verify DNS with `nslookup dev.grove.place` |
| Google "redirect_uri mismatch" | Ensure `https://dev.grove.place/api/auth/callback/google` is in Google Console |
| Cookies not persisting | Check browser dev tools — cookies should have `.grove.place` domain |
| Auth URLs still pointing to production | Ensure `.env.local` has `VITE_AUTH_API_URL` uncommented; restart dev server |
| CORS errors | Should not happen — `dev.grove.place` is covered by `isGroveSubdomain()` |

## 9. Cleanup

When done with local testing:

1. Stop the tunnel: `Ctrl+C` in tunnel terminal
2. Optional: Remove tunnel (keep if planning future use):
   ```bash
   cloudflared tunnel delete grove-dev
   ```
3. The Google Console redirect URI can stay — it does nothing when the tunnel isn't running
