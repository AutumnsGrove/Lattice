# Local Auth Testing with Cloudflare Tunnel

> Test the full Google OAuth login flow from your local dev server — no deploy needed.

---

## Why This Exists

Grove's login flow redirects to Google, which needs a real HTTPS domain it recognizes. You can't just visit `localhost:5173` and click "Sign in with Google" — Google will reject the callback because `localhost` isn't in the authorized redirect URIs.

The solution: a Cloudflare Tunnel that maps `https://dev.grove.place` to your local machine. Google sees a real domain, cookies work because `.grove.place` covers all subdomains, and you get the full production auth experience while developing locally.

### How It Works

```
Browser → https://dev.grove.place
              ↓
    Cloudflare Tunnel (encrypted)
              ↓
    localhost:5173 (your dev server)
              ↓
    LoginGraft POSTs to auth-api.grove.place (production Heartwood)
              ↓
    Google OAuth → callback to dev.grove.place
              ↓
    Tunnel → localhost:5173/auth/callback
              ↓
    Authenticated! Cookie set on .grove.place
```

### Why So Little Code Changed

Grove was already tunnel-ready and we didn't know it:

- **Trusted origins**: Heartwood uses `https://*.grove.place` — already includes `dev.grove.place`
- **Cookie domain**: `.grove.place` (leading dot) covers all subdomains automatically
- **CORS**: `isGroveSubdomain()` allows any `*.grove.place` HTTPS origin
- **Callback URL**: LoginGraft uses `window.location.origin` dynamically — through the tunnel, that's `https://dev.grove.place`

The only code change: making `GROVEAUTH_URLS` in the engine read from an env var so the LoginGraft can POST to the right auth server.

---

## Prerequisites

| Requirement           | Check                                         |
| --------------------- | --------------------------------------------- |
| macOS with Homebrew   | `brew --version`                              |
| cloudflared CLI       | `brew install cloudflared`                    |
| Cloudflare login      | `cloudflared login` (one-time, opens browser) |
| Google Console access | For adding the dev redirect URI               |

---

## First-Time Setup

### 1. Install cloudflared

```bash
brew install cloudflared
```

### 2. Authenticate with Cloudflare

```bash
cloudflared login
```

This opens your browser to authorize cloudflared with your Cloudflare account. It's a one-time step — the credentials persist at `~/.cloudflared/cert.pem`.

### 3. Run the Setup Script

```bash
./scripts/dev-tunnel.sh setup
```

This does three things:

1. Creates a named tunnel called `grove-dev` (persists across sessions)
2. Writes a tunnel config to `~/.cloudflared/config-grove-dev.yml`
3. Creates a DNS CNAME record: `dev.grove.place` → your tunnel

You should see output like:

```
[tunnel] Setting up Grove dev tunnel...
[tunnel] Tunnel created (ID: abc123...)
[tunnel] Config written
[tunnel] DNS route created: dev.grove.place -> tunnel
[tunnel] Setup complete!
```

### 4. Set Up the Environment Variable

```bash
cp apps/landing/.env.local.example apps/landing/.env.local
```

Then edit `apps/landing/.env.local` and uncomment the line:

```
VITE_AUTH_API_URL=https://dev.grove.place
```

This tells the LoginGraft to POST auth requests to `dev.grove.place` instead of the production `auth-api.grove.place`. Since the tunnel routes `dev.grove.place` to your local machine, and your local machine forwards the auth request to production Heartwood, the full flow works.

### 5. Add the Google Console Redirect URI

This is the one manual step that can't be automated:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → Grove project
2. **APIs & Services** → **Credentials** → **OAuth 2.0 Client IDs**
3. Edit the Client ID used by Grove
4. Under **Authorized redirect URIs**, add:
   ```
   https://dev.grove.place/api/auth/callback/google
   ```
5. Save

This is a one-time setup. The URI can stay forever — it does nothing when the tunnel isn't running.

---

## Day-to-Day Usage

Two terminals, every time:

### Terminal 1: Start the Tunnel

```bash
./scripts/dev-tunnel.sh
```

Wait for the connection confirmation:

```
[tunnel] Starting Grove dev tunnel...
[tunnel]   dev.grove.place -> localhost:5173
```

### Terminal 2: Start the Dev Server

```bash
cd apps/landing && bun run dev
```

### Test It

1. Open **https://dev.grove.place** in your browser
2. Click **Sign in with Google**
3. Complete the Google login
4. You'll land back at `dev.grove.place` authenticated with a valid session cookie

### When You're Done

`Ctrl+C` in the tunnel terminal. That's it — the tunnel stops, `dev.grove.place` goes nowhere, and nothing is left running.

---

## Script Reference

```bash
./scripts/dev-tunnel.sh          # Start the tunnel (default)
./scripts/dev-tunnel.sh setup    # First-time setup
./scripts/dev-tunnel.sh status   # Check if tunnel exists and is configured
```

### Custom Port

If your dev server runs on a different port:

```bash
DEV_PORT=3000 ./scripts/dev-tunnel.sh
```

---

## Advanced: Testing Heartwood Changes Locally

The basic setup routes all traffic to your local SvelteKit dev server, but auth requests still go to production Heartwood (via `auth-api.grove.place`). If you're actively developing Heartwood and want to test auth code changes locally:

### 1. Run Heartwood Locally

```bash
cd packages/heartwood && wrangler dev --local
```

This starts Heartwood on port 8787.

### 2. Update the Tunnel Config

Edit `~/.cloudflared/config-grove-dev.yml` to split routing:

```yaml
ingress:
  - hostname: dev.grove.place
    path: /api/auth/*
    service: http://localhost:8787
  - hostname: dev.grove.place
    service: http://localhost:5173
  - service: http_status:404
```

### 3. Restart the Tunnel

```bash
./scripts/dev-tunnel.sh
```

Now `/api/auth/*` requests go to your local Heartwood, and everything else goes to SvelteKit. Three terminals total (tunnel, heartwood, landing).

> Restore the original config when you're done testing Heartwood — the split routing won't work without a local Heartwood running.

---

## Troubleshooting

### "cloudflared: command not found"

```bash
brew install cloudflared
```

### "Unable to connect" or tunnel won't start

Make sure you've logged in:

```bash
cloudflared login
```

Then check the tunnel exists:

```bash
./scripts/dev-tunnel.sh status
```

If the tunnel is missing, run setup again:

```bash
./scripts/dev-tunnel.sh setup
```

### Google says "redirect_uri_mismatch"

The redirect URI in Google Console doesn't match. Make sure you've added exactly:

```
https://dev.grove.place/api/auth/callback/google
```

No trailing slash, `https` not `http`.

### dev.grove.place loads but auth still hits production

Your `.env.local` isn't being read. Check:

1. The file exists at `apps/landing/.env.local`
2. The `VITE_AUTH_API_URL` line is uncommented
3. You restarted `bun run dev` after creating/editing the file (Vite reads env files at startup)

### Cookies aren't persisting after login

Check browser dev tools → Application → Cookies. The session cookie should have:

- **Domain**: `.grove.place` (with leading dot)
- **Secure**: Yes
- **SameSite**: Lax

If the domain is wrong, something is overriding the cookie config. Check Heartwood's Better Auth settings.

### CORS errors

This shouldn't happen — `dev.grove.place` is covered by Heartwood's `isGroveSubdomain()` wildcard check. If you see CORS errors, the request origin might not be `https://dev.grove.place`. Verify you're accessing through the tunnel URL, not `localhost` directly.

---

## How It Works Under the Hood

For the curious — here's what actually changed to make this work.

### The One Code Change

In `libs/engine/src/lib/grafts/login/config.ts`:

```typescript
// Before: hardcoded
export const GROVEAUTH_URLS = {
	api: "https://auth-api.grove.place",
	socialSignIn: "https://auth-api.grove.place/api/auth/sign-in/social",
	magicLink: "https://auth-api.grove.place/api/auth/sign-in/magic-link",
};

// After: env-aware with production fallback
const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_URL ?? "https://auth-api.grove.place";

export const GROVEAUTH_URLS = {
	api: AUTH_API_BASE,
	socialSignIn: `${AUTH_API_BASE}/api/auth/sign-in/social`,
	magicLink: `${AUTH_API_BASE}/api/auth/sign-in/magic-link`,
};
```

`VITE_AUTH_API_URL` is a Vite env var — it gets baked into the JS bundle at compile time. In production (Cloudflare Pages), it's not set, so the fallback kicks in. Locally, `.env.local` sets it to `https://dev.grove.place`.

### What Didn't Need to Change

| Component                 | Why It Already Worked                                                                |
| ------------------------- | ------------------------------------------------------------------------------------ |
| Heartwood trusted origins | `https://*.grove.place` wildcard covers `dev.grove.place`                            |
| Cookie domain             | `.grove.place` (leading dot) covers all subdomains                                   |
| CORS middleware           | `isGroveSubdomain()` checks `*.grove.place` dynamically                              |
| LoginGraft callback URL   | Uses `window.location.origin` — resolves to `https://dev.grove.place` through tunnel |
| GroveAuthClient (server)  | Uses service bindings, not public URLs                                               |

---

_Last updated: 2026-02-06_
