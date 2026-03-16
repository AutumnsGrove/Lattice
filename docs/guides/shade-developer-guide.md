---
title: "Shade Developer Guide"
description: "Layered defense system protecting creator content from AI crawlers and automated data harvesting."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - shade
  - security
  - ai-protection
  - turnstile
  - cloudflare
---

# Shade Developer Guide

Shade is Grove's content protection system. It layers nine defenses between AI crawlers and the words people write here. Most of these layers run outside application code (Cloudflare dashboard toggles, robots.txt, legal documents), but several are implemented in the engine and require developer attention when modifying routes, adding services, or debugging verification failures.

For the full architectural spec and implementation checklist, see `docs/specs/shade-spec.md`.

## The nine layers at a glance

Each layer catches what others miss. Determined scrapers face compounding difficulty.

| # | Layer | Where it lives | What it stops |
|---|-------|---------------|---------------|
| 1 | Cloudflare native tools | Dashboard toggles | Known AI crawler user agents, behavioral bot detection, AI Labyrinth resource waste |
| 2 | WAF custom rules | Dashboard rules | Empty/suspicious user agents, high threat scores |
| 3 | Rate limiting | Dashboard + `hooks.server.ts` | Bulk scrapers, aggressive crawling patterns |
| 4 | robots.txt | `libs/engine/static/robots.txt` | Compliant crawlers (GPTBot, some archive bots) |
| 5 | HTML meta tags + HTTP headers | `hooks.server.ts` | Emerging `noai`/`noimageai` standard adoption |
| 6 | Legal framework | `/shade` page, Terms of Service | Nothing technical, but establishes legal standing |
| 7 | Turnstile human verification | Engine routes + hooks | Automated scripts, headless browsers |
| 8 | Archive service protection | `robots.txt` directives | Internet Archive, Archive-It, compliant archive crawlers |
| 9 | TDMRep rights reservation | `hooks.server.ts` + `.well-known/tdmrep.json` | Compliant TDM operators under EU CDSM Article 4 |

Layers 1, 2, and 3 (Cloudflare-side) are configured in the dashboard. Layers 4 and 8 share `robots.txt`. Layers 5, 7, and 9 are implemented in engine code. Layer 6 is content on the `/shade` page and Terms of Service.

---

## Turnstile verification flow

This is the layer developers interact with most. Every first-time visitor to a protected page goes through Turnstile before seeing content.

### How it works

1. A request hits `hooks.server.ts`. The hook checks whether the path is excluded (API routes, auth, static assets). If not excluded, it reads the `grove_verified` cookie.
2. If the cookie is missing or invalid, the hook redirects to `/verify?return=<original_url>`.
3. The verify page loads a Cloudflare Turnstile widget in managed mode. For most humans, this is invisible.
4. On success, the widget returns a token. The page POSTs it to `/api/verify/turnstile`.
5. The endpoint validates the token with Cloudflare's `siteverify` API, creates an HMAC-signed cookie, and returns it via `Set-Cookie`.
6. The verify page does a hard redirect (`window.location.href`) back to the original URL. A hard redirect is required because SvelteKit's client-side navigation won't pick up the new cookie.
7. On the next request, the hook finds a valid cookie and lets the request through. The cookie lasts 30 days.

### Key files

| File | Role |
|------|------|
| `libs/engine/src/hooks.server.ts` | Reads `grove_verified` cookie, redirects unverified visitors to `/verify` |
| `libs/engine/src/routes/verify/+page.svelte` | Verification page with Turnstile widget |
| `libs/engine/src/routes/verify/+page.server.ts` | Provides site key, validates redirect target, skips if already verified |
| `libs/engine/src/routes/api/verify/turnstile/+server.ts` | POST endpoint that validates token and sets cookie |
| `libs/engine/src/lib/server/services/turnstile.ts` | Token verification, cookie creation/validation, HMAC signing |
| `libs/engine/src/lib/ui/components/forms/TurnstileWidget.svelte` | Svelte 5 component wrapping the Turnstile JS API |

### Excluded paths

These paths skip Turnstile verification entirely. The list lives in `hooks.server.ts`:

```typescript
const TURNSTILE_EXCLUDED_PATHS = [
  "/verify",      // The verification page itself
  "/api/",        // All API routes
  "/auth/",       // OAuth callbacks
  "/_app/",       // SvelteKit internals
  "/favicon",     // Static assets
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known/",
];
```

If you add a new public route that should be accessible without verification (an RSS feed endpoint, a health check), add its prefix to this array.

---

## The cookie system

The `grove_verified` cookie uses HMAC-SHA256 to prevent forgery.

### Cookie format

```
grove_verified=<timestamp>:<hmac_signature>
```

The timestamp is `Date.now()` at creation time. The signature is an HMAC-SHA256 of the timestamp using `TURNSTILE_SECRET_KEY` as the key.

### Cookie attributes

| Attribute | Value | Why |
|-----------|-------|-----|
| Domain | `grove.place` | Shared across all tenant subdomains |
| Path | `/` | Applies everywhere |
| Max-Age | `2592000` (30 days) | Balance between UX and security |
| HttpOnly | `true` | Not accessible to client-side JS |
| Secure | `true` | HTTPS only |
| SameSite | `Lax` | Sent on top-level navigations, not cross-origin requests |

### Validation

`validateVerificationCookie()` in `turnstile.ts` checks two things: that the HMAC signature matches (proving the cookie wasn't forged) and that the timestamp hasn't expired (proving it's still within the 30-day window). Both checks must pass.

```typescript
import {
  validateVerificationCookie,
  TURNSTILE_COOKIE_NAME,
} from "$lib/server/services/turnstile";

const cookie = getCookie(cookieHeader, TURNSTILE_COOKIE_NAME);
const isVerified = await validateVerificationCookie(
  cookie ?? undefined,
  secretKey,
);
```

The signing uses the Web Crypto API (`crypto.subtle.importKey` + `crypto.subtle.sign`), so it works in Cloudflare Workers without external dependencies.

---

## HTTP headers set by hooks.server.ts

Shade adds two response headers on every request. Both are set in the security headers section at the bottom of `hooks.server.ts`:

```typescript
// Shade Layer 5: AI/TDM opt-out headers
response.headers.set("X-Robots-Tag", "noai, noimageai");
// Shade Layer 9: TDMRep — W3C text and data mining rights reservation
response.headers.set("TDM-Reservation", "1");
```

`X-Robots-Tag: noai, noimageai` signals to compliant crawlers that page content and images should not be used for AI training. This is distinct from `noindex` (which would break search).

`TDM-Reservation: 1` is the W3C TDMRep protocol header. It declares that text and data mining rights are reserved, which has legal backing under EU CDSM Directive Article 4. Crawlers check this header during scraping to determine whether they have permission.

These headers apply to all responses. If you need to exempt a specific route from these headers (unlikely, but possible for syndication feeds), you'd add conditional logic before these lines.

---

## robots.txt management

The robots.txt file lives at `libs/engine/static/robots.txt`. It's a static file served by SvelteKit. The blocklist is organized into sections by company (OpenAI, Anthropic, Google AI, Meta, etc.) and includes 100+ known AI crawler user agents.

### Adding a new bot rule

When a new AI crawler appears:

1. Open `libs/engine/static/robots.txt`.
2. Find the appropriate section (by company) or the "OTHER AI CRAWLERS" section at the bottom.
3. Add the entry:

```
User-agent: NewCrawlerBot
Disallow: /
```

4. If it's a major company with multiple crawlers, create a new labeled section. Keep the formatting consistent with existing sections.

The blocklist is maintained using [ai.robots.txt](https://github.com/ai-robots-txt/ai.robots.txt) as a reference, supplemented by [Dark Visitors](https://darkvisitors.com) alerts for new crawler user agents.

### What robots.txt does not block

robots.txt is voluntary. Many scrapers ignore it. Perplexity is a documented offender. Archive.today explicitly states it acts "as a direct agent of the human user" and does not respect robots.txt. The file is a legal signal first, a technical barrier second.

### Search engines we allow

Googlebot, Bingbot, DuckDuckBot, KagiBot, Slurp (Yahoo), Yandex, and Baiduspider are explicitly allowed. Google-Extended (the AI training crawler, separate from search indexing Googlebot) is blocked.

---

## Configuring rate limits

Rate limiting in Shade operates at two levels.

### Cloudflare dashboard (Layer 3)

Three rules configured in the WAF:

| Rule | Threshold | Window | Action |
|------|-----------|--------|--------|
| General Browsing | 60 requests | 1 minute | Challenge |
| Page Crawling | 200 requests | 5 minutes | Block |
| API Protection | 30 requests | 1 minute | Block |

These are managed in the Cloudflare dashboard under Security > WAF > Rate Limiting Rules. They cannot be changed in code.

### Application-level (hooks.server.ts)

API routes have an additional rate limit enforced by the Threshold SDK in `hooks.server.ts`. This layer provides per-user isolation and graduated response:

```typescript
if (event.url.pathname.startsWith("/api/")) {
  const threshold = createThreshold(event.platform?.env, { identifier });
  if (threshold) {
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(event.request.method);
    const denied = await thresholdCheck(threshold, {
      key: isWrite ? "api:write" : "api:read",
      limit: isWrite ? 30 : 120,
      windowSeconds: 60,
    });
    if (denied) return denied;
  }
}
```

Read endpoints allow 120 requests per minute. Write endpoints allow 30. The identifier is the user ID for authenticated requests, or the client IP for anonymous ones.

The Turnstile verification endpoint has its own tighter limit: 10 attempts per minute per IP. Each verification call hits Cloudflare's external API, so this limit protects against abuse of that external dependency.

---

## CSP requirements for Turnstile

The Content Security Policy in `hooks.server.ts` must allow Cloudflare's Turnstile domain. Three directives include `challenges.cloudflare.com`:

```
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

If you modify the CSP, keep these entries. Without them, the Turnstile widget will fail to load and visitors will be stuck on the verify page with no way through.

---

## TDMRep (Layer 9)

TDMRep (Text and Data Mining Reservation Protocol) is a W3C protocol that lets rightsholders declare a blanket opt-out of text and data mining. Unlike robots.txt, which requires naming individual crawler user agents, TDMRep applies horizontally to all TDM operators.

Grove implements TDMRep through two mechanisms:

1. The `TDM-Reservation: 1` HTTP header (set on every response in `hooks.server.ts`).
2. A `.well-known/tdmrep.json` file served at the domain root, pointing to the `/shade` page as the human-readable TDM policy.

The header provides per-response confirmation. The JSON file provides domain-wide discovery for crawlers that check before scraping. Per the TDMRep spec, both should be present.

---

## Why things break

### "I'm stuck in a verification loop"

The most common issue. The verify page loads, Turnstile succeeds, but the redirect loops back to `/verify`.

Check these in order:

1. Is `TURNSTILE_SECRET_KEY` set in the environment? Without it, `createVerificationCookie()` will fail silently and no cookie gets set.
2. Is the cookie domain correct? The cookie is set to `grove.place` (no leading dot). If you're testing on localhost, the cookie won't be set because the domain doesn't match. In local dev, the Turnstile enforcement is skipped when `TURNSTILE_SECRET_KEY` is absent from the environment.
3. Is the redirect using `window.location.href`? SvelteKit's `goto()` won't pick up newly set cookies. The verify page uses a hard redirect for this reason.

### "Bot X is getting through"

Check whether the bot respects robots.txt. If it doesn't, the only defenses are Cloudflare's behavioral detection (Layer 1), WAF rules (Layer 2), and Turnstile (Layer 7). If the bot is in Cloudflare's known list, ensure the "Block AI Bots" toggle is on in the dashboard.

For new/unknown bots: add them to `robots.txt` (for compliant bots) and consider a WAF custom rule (you have 2 reserved slots of 5 total).

### "Legitimate users are getting challenged"

Turnstile in managed mode is invisible for most users. VPN users and those with unusual browser configurations may see a brief spinner (2-3 seconds). This is expected and within the 5% false-positive tolerance documented in the spec. If a specific user agent or IP range is being consistently challenged, review Cloudflare Security > Events to identify the trigger.

### "The TDM-Reservation header is missing"

The header is set unconditionally in `hooks.server.ts`. If it's missing, check that the response is actually flowing through the SvelteKit hook (static assets served directly by Cloudflare Pages bypass the hook). For static assets, use Cloudflare Transform Rules to add the header at the edge.

---

## Key files

```
libs/engine/src/hooks.server.ts                          # Turnstile enforcement, HTTP headers, rate limiting
libs/engine/src/routes/verify/+page.svelte               # Verification page UI
libs/engine/src/routes/verify/+page.server.ts            # Verification page server (site key, redirect validation)
libs/engine/src/routes/api/verify/turnstile/+server.ts   # Token validation endpoint
libs/engine/src/lib/server/services/turnstile.ts         # HMAC signing, cookie creation/validation
libs/engine/src/lib/ui/components/forms/TurnstileWidget.svelte  # Turnstile Svelte component
libs/engine/static/robots.txt                            # AI crawler blocklist (100+ user agents)
docs/specs/shade-spec.md                                 # Full architectural spec
```

---

## Quick checklist

When working on Shade-related code:

- [ ] New public route? Check if it needs to be added to `TURNSTILE_EXCLUDED_PATHS`
- [ ] Modifying CSP? Keep `challenges.cloudflare.com` in script-src, connect-src, and frame-src
- [ ] New AI crawler reported? Add its user agent to `libs/engine/static/robots.txt`
- [ ] Changing cookie logic? Verify HMAC signing still uses `TURNSTILE_SECRET_KEY` from `platform.env`
- [ ] Touching response headers? Confirm `X-Robots-Tag` and `TDM-Reservation` headers survive your changes
- [ ] Testing locally? Turnstile enforcement is skipped when `TURNSTILE_SECRET_KEY` is absent. Set it in `.dev.vars` if you need to test the full flow
