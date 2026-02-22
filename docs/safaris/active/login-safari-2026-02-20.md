---
title: "Login Safari — Into the Authentication Wilderness"
status: active
category: safari
---

# Login Safari — Into the Authentication Wilderness

> Four distress signals from the same region. One systemic root cause, one separate CSS/config issue, and a handful of missing puzzle pieces. The landscape is mapped.

**Territory:** Login authentication ecosystem across login hub, Heartwood, meadow, grove-router, and waystones
**Terrain type:** Auth flows, service bindings, CSP config, UI components
**Stops:** 7
**Date:** 2026-02-20

---

## Route Map

| #   | Stop                         | Category          | Status  |
| --- | ---------------------------- | ----------------- | ------- |
| 1   | Login Page UI                | Frontend (Svelte) | Growing |
| 2   | Google OAuth Server Action   | Auth flow         | Barren  |
| 3   | Passkey Sign-In              | Auth flow         | Barren  |
| 4   | Auth Proxy & Service Binding | Infrastructure    | Wilting |
| 5   | Cross-Property Sessions      | Auth architecture | Wilting |
| 6   | Waystone Rendering           | UI / CSP / Config | Barren  |
| 7   | Meadow Auth Integration      | Auth flow         | Growing |

---

## The Root Cause Pattern

Three of four reported failures share a single dependency: **the AUTH service binding**.

```
Google OAuth ──┐
               ├──► AUTH service binding ──► Heartwood (groveauth worker)
Passkey flow ──┤
               │
Meadow session ┘
```

If the AUTH service binding on login.grove.place (Cloudflare Pages) is misconfigured, broken, or pointing at a non-existent worker:

- Google → POST to Heartwood fails → no redirect → "Google sign-in failed to start"
- Passkey → POST to Heartwood fails → client library silently fails → no visible error
- Meadow → session validation fails → `locals.user` stays null → appears logged out

The fourth issue (waystones) is **completely separate** — a CSP + missing article slug problem.

---

## 1. Login Page UI

**Character**: The warm, centered welcome mat for all of Grove — a minimal glass card that says "Welcome back, Wanderer."

### Safari findings: What exists today

**Page component** (`apps/login/src/routes/+page.svelte`, 255 lines):

- [x] Clean three-provider layout: Google, Passkey, Email
- [x] Progressive enhancement — Google and email use server-side form actions (no JS required)
- [x] Passkey correctly uses client-side WebAuthn (navigator.credentials is browser-only)
- [x] `use:enhance` on forms for non-JS graceful degradation
- [x] Redirect URL validation via `validateRedirectUrl()` (blocks open redirects)
- [x] Error display shared between server action errors and passkey client errors
- [x] Email sent confirmation state with "use a different method" escape
- [ ] **No "Sign In" link visible on meadow page** — meadow relies on `buildLoginUrl()` in auth-required flows, but the main page (`+page.svelte`) has no visible sign-in button/link in the header

**Layout** (`apps/login/src/routes/+layout.svelte`, 57 lines):

- [x] Minimal chrome — logo + theme toggle + centered content + footer
- [x] Logo doubles as theme toggle (tap to switch dark/light)
- [x] Imports from engine: `Logo`, `ThemeToggle`, `seasonStore`, `themeStore`
- [x] Season-aware logo rendering

### Design spec (safari-approved)

No major changes needed to the UI layer — the login page itself is well-constructed. The issues are all in the plumbing underneath.

---

## 2. Google OAuth Server Action

**Character**: The server-side form action that should redirect you to Google and then bring you back — currently dead in the water.

### Safari findings: What exists today

**Server action** (`apps/login/src/routes/+page.server.ts`, 229 lines):

The `google` action:

1. Reads redirect URL from form data
2. Sets `grove_auth_redirect` cookie (HttpOnly, for callback fallback)
3. Calls `platform.env.AUTH.fetch()` to Heartwood's `/api/auth/sign-in/social`
4. Expects a 301/302 redirect response with Google OAuth URL in `Location` header
5. Forwards `set-cookie` headers from Heartwood (oauth_state, etc.)
6. Throws redirect to Google

**The failure path** (line 147-150):

```typescript
return fail(500, {
	provider: "google" as const,
	error: "Google sign-in failed to start. Please try again.",
});
```

This EXACT error message triggers when the response from Heartwood is **not** a 301/302 or has no `Location` header.

**Root causes to investigate:**

- [ ] **Service binding not configured** — `wrangler.toml` defines `AUTH = groveauth`, but Cloudflare Pages bindings are set in the Dashboard (Settings > Functions > Service bindings), NOT in wrangler.toml for Pages. The wrangler.toml may not be read for bindings on Pages.
- [ ] **Heartwood returning non-redirect** — If Better Auth encounters an error (missing env vars, DB issue), it returns 200/400/500 JSON instead of a 302 redirect
- [ ] **GROVEAUTH_URL misconfigured** — The `authBaseUrl` falls back to `https://login.grove.place` if the env var isn't set. This is the login app's own URL, not the Heartwood worker URL. Service binding calls use the URL for routing — if it's wrong, the request routes incorrectly.

### Design spec (safari-approved)

#### Fix 1: Verify service binding in Cloudflare Dashboard

The login app's `wrangler.toml` defines:

```toml
[[services]]
binding = "AUTH"
service = "groveauth"
```

For Cloudflare Pages projects, service bindings must ALSO be configured in the Dashboard:
**Pages > grove-login > Settings > Functions > Service bindings**

Check that `AUTH` → `groveauth` is configured there.

#### Fix 2: Add diagnostic logging to the Google action

The current error is a generic "failed to start" — no information about WHAT failed. Add:

```typescript
// After the fetch:
console.log("[Google OAuth] Response status:", response.status);
console.log("[Google OAuth] Location:", response.headers.get("location"));
if (response.status >= 400) {
	const body = await response.text();
	console.error("[Google OAuth] Error body:", body);
}
```

#### Fix 3: Handle non-redirect responses with specific errors

Instead of generic "failed to start", surface the actual issue:

- 503 from Heartwood → "Auth service is temporarily unavailable"
- 400 from Heartwood → "Configuration error" (with admin-visible detail)
- 200 JSON → "Unexpected response from auth service"

---

## 3. Passkey Sign-In

**Character**: The WebAuthn-powered biometric flow — should be the fastest path to "you're in." Currently silent.

### Safari findings: What exists today

**Client-side handler** (`apps/login/src/routes/+page.svelte`, lines 50-73):

```typescript
const result = await authClient.signIn.passkey();
if (result.error) {
	throw new Error(result.error.message || "Passkey sign-in failed");
}
```

**Auth client** (`apps/login/src/lib/auth-client.ts`):

```typescript
export const authClient = createAuthClient({
	baseURL: "", // same-origin — all requests go to /api/auth/* proxy
	plugins: [magicLinkClient(), passkeyClient()],
});
```

**Problem**: The `authClient.signIn.passkey()` flow:

1. Fetches authentication options from `/api/auth/passkey/generate-authenticate-options`
2. This proxies via the `[...path]` catch-all to Heartwood
3. If AUTH service binding is broken, this fetch fails
4. better-auth's client library catches the error internally
5. The returned `result` may have an `error` property, OR the client may throw

- [ ] **Silent failure** — When the API call fails (network/binding error), better-auth's client may not return a clean `result.error`. The catch block tries `err instanceof Error && err.name === 'NotAllowedError'`, but a fetch failure would have a different error name. The generic fallback `'Passkey sign-in failed'` IS there, but the user reports seeing nothing.
- [ ] **Same root cause as Google** — AUTH service binding broken means the proxy returns 503, which the client interprets as... what? Depends on better-auth client error handling.

### Design spec (safari-approved)

#### Fix 1: Wrap passkey flow with explicit fetch error handling

Before delegating to `authClient.signIn.passkey()`, verify the auth API is reachable:

```typescript
// Pre-flight check
try {
	const health = await fetch("/api/auth/ok"); // Or use the session endpoint
	if (!health.ok) throw new Error("Auth service unavailable");
} catch {
	passkeyError = "Auth service is currently unavailable. Please try again.";
	passkeyLoading = false;
	return;
}
```

#### Fix 2: Improve error surfacing

The passkey error catch should handle ALL error types, not just `NotAllowedError`:

```typescript
} catch (err) {
  if (err instanceof Error) {
    if (err.name === 'NotAllowedError') {
      passkeyError = 'Passkey sign-in was cancelled or timed out.';
    } else if (err.message.includes('503') || err.message.includes('unavailable')) {
      passkeyError = 'Auth service is temporarily unavailable.';
    } else {
      passkeyError = err.message || 'Passkey sign-in failed';
    }
  } else {
    passkeyError = 'Passkey sign-in failed. Please try again.';
  }
}
```

---

## 4. Auth Proxy & Service Binding

**Character**: The invisible plumbing that connects the login UI to Heartwood — the water main that feeds every faucet. Currently suspected broken.

### Safari findings: What exists today

**Proxy module** (`apps/login/src/lib/proxy.ts`, 153 lines):

- [x] Security hardened (HAWK-005/006/007): response header allowlist, body size limit, cookie filtering
- [x] Only forwards auth-related cookies (exact match + prefix match)
- [x] CSRF handled by SvelteKit's built-in `csrf.checkOrigin`
- [x] Query parameters forwarded (critical for OAuth `?state=...&code=...`)

**Auth API catch-all** (`apps/login/src/routes/api/auth/[...path]/+server.ts`):

- [x] Path validation: only `[a-zA-Z0-9\-/]+`
- [x] Exports GET/POST/PUT/DELETE/PATCH handlers
- [x] Delegates to `proxyToHeartwood()`

**Service binding configuration:**

- `wrangler.toml`: `binding = "AUTH"`, `service = "groveauth"`
- `app.d.ts`: `AUTH: Fetcher` in `Platform.env`

**The critical question: Is the Pages service binding actually connected?**

For Cloudflare Pages, wrangler.toml bindings are advisory — they work for `wrangler pages dev` locally, but production bindings are set in the Dashboard. If someone deployed the login app without configuring the binding in the Dashboard, or if the groveauth worker was renamed/redeployed, the binding could be dangling.

- [ ] **Verify**: Cloudflare Dashboard > Pages > grove-login > Settings > Functions > Service bindings > AUTH = groveauth
- [ ] **Verify**: Same for grove-meadow Pages project
- [ ] **Test**: Hit `https://login.grove.place/api/auth/ok` or similar — should proxy to Heartwood and return a response. If 503, binding is broken.

### Design spec (safari-approved)

#### Fix 1: Verify and fix service bindings in Cloudflare Dashboard

Both `grove-login` and `grove-meadow` Pages projects need:

- **AUTH** binding pointing to `groveauth` worker

#### Fix 2: Add a health endpoint that tests the binding

Create a simple endpoint at `apps/login/src/routes/api/health/binding/+server.ts`:

```typescript
export const GET = async ({ platform }) => {
	if (!platform?.env?.AUTH) {
		return json({ ok: false, error: "AUTH binding not available" }, { status: 503 });
	}
	try {
		const res = await platform.env.AUTH.fetch("https://login.grove.place/health");
		return json({ ok: res.ok, status: res.status });
	} catch (e) {
		return json({ ok: false, error: "Binding fetch failed" }, { status: 503 });
	}
};
```

---

## 5. Cross-Property Session Sharing

**Character**: The invisible forest network — like mycelium connecting trees, session cookies should connect all Grove properties through `.grove.place` domain scoping.

### Safari findings: What exists today

**How sessions SHOULD flow:**

1. User authenticates at `login.grove.place`
2. Better Auth (Heartwood) sets cookie: `better-auth.session_token` with `domain=.grove.place`
3. Browser sends this cookie to ALL `*.grove.place` subdomains
4. Each property validates the cookie via AUTH service binding → Heartwood → SessionDO

**Better Auth config** (`services/heartwood/src/auth/index.ts`):

```typescript
advanced: {
  crossSubDomainCookies: {
    enabled: true,
    domain: ".grove.place",
  },
  defaultCookieAttributes: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  },
}
```

This is correct — cookies WILL be set on `.grove.place` domain.

**Meadow's session check** (`apps/meadow/src/hooks.server.ts`):

```typescript
const groveSession = getCookie(cookieHeader, "grove_session");
const betterAuthSession =
	getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
	getCookie(cookieHeader, "better-auth.session_token");
const sessionCookie = groveSession || betterAuthSession;

if (sessionCookie && event.platform?.env?.AUTH) {
	const response = await event.platform.env.AUTH.fetch(
		"https://login.grove.place/session/validate",
		{ method: "POST", headers: { Cookie: cookieHeader || "" } },
	);
	// ... parse response ...
}
```

**Why meadow appears logged out (even when you're signed in on your grove):**

The user IS signed in — the session cookie exists in the browser. But meadow needs TWO things:

1. The browser sending the cookie ✅ (`.grove.place` domain scoping)
2. The AUTH service binding being functional ❓

If meadow's AUTH service binding is broken:

- `event.platform?.env?.AUTH` exists but `.fetch()` fails
- The catch block logs the error and `locals.user` stays null
- User appears logged out even though their session cookie is valid

**The personal grove (e.g., autumn.grove.place) works because** it goes through the engine, which may validate sessions via a different mechanism (possibly its own direct D1 query or a different service binding).

- [ ] **Verify**: meadow's AUTH binding in Cloudflare Dashboard
- [ ] **Check**: Does the engine validate sessions the same way or differently?
- [ ] **Fallback**: If AUTH binding is unavailable, should meadow show "auth unavailable" rather than appearing logged-out?

### Design spec (safari-approved)

#### Fix 1: Verify meadow's AUTH service binding

Dashboard: Pages > grove-meadow > Settings > Functions > Service bindings > AUTH = groveauth

#### Fix 2: Improve meadow's session error visibility

Currently:

```typescript
} catch (err) {
  console.error("[Meadow Auth] SessionDO validation error:", err);
}
```

This silently swallows the error. Add visual feedback:

```typescript
} catch (err) {
  console.error("[Meadow Auth] SessionDO validation error:", err);
  // Surface to UI so the user knows auth is broken, not that they're logged out
  event.locals.authError = "session_validation_failed";
}
```

---

## 6. Waystone Rendering

**Character**: The helpful trail markers that should guide Wanderers — but on the login page, they're invisible ghosts.

### Safari findings: What exists today

**Waystones on the login page:**

1. `<Waystone slug="what-are-passkeys" label="What's a passkey?" size="sm" />` (next to passkey button)
2. `<Waystone slug="understanding-your-privacy" label="How we protect your data" size="sm" inline />` (in footer)

**The Waystone component** (`libs/engine/src/lib/ui/components/ui/waystone/Waystone.svelte`):

- Fetches excerpts from `https://grove.place/api/kb/excerpt/${slug}`
- Renders a `HelpCircle` icon with popup
- Uses CSS custom properties: `--glass-bg`, `--color-surface`, `--color-border`, etc.
- Falls back to a link if JS disabled

**THREE problems found:**

### Problem A: Missing article slug

The `WAYSTONE_ARTICLE_SLUGS` list in `apps/landing/src/routes/api/kb/excerpt/[slug]/+server.ts` does NOT include `"what-are-passkeys"`. Available slugs include `"what-is-heartwood"`, `"sessions-and-cookies"`, `"understanding-your-privacy"`, etc. — but NO passkey article.

This means the excerpt API returns 404 for `what-are-passkeys`, and the Waystone shows "Unable to load help content."

### Problem B: CSP blocks excerpt API calls

The login app's CSP (`apps/login/svelte.config.js`):

```javascript
"connect-src": ["self", "https://*.grove.place"],
```

The Waystone fetches from `https://grove.place/api/kb/excerpt/...`.

**`https://*.grove.place` does NOT match `https://grove.place`!**

The `*` wildcard in CSP requires at least one subdomain label. The apex domain `grove.place` is not a subdomain of itself. The browser blocks the fetch with a CSP `connect-src` violation.

This means BOTH waystones on the login page are silently blocked from loading content.

### Problem C: Waystone styling may be incomplete

The Waystone uses CSS custom properties (`--glass-bg`, `--color-surface`, `--color-border`, `--color-text-muted`, `--color-accent`, `--color-primary`). These need to be defined by the app's CSS or the engine's styles.

The login layout imports `../app.css` — need to verify this includes the engine's CSS variable definitions. If not, waystones would render with fallback/missing styles.

### Design spec (safari-approved)

#### Fix 1: Add CSP exception for grove.place apex domain

In `apps/login/svelte.config.js`:

```javascript
"connect-src": ["self", "https://grove.place", "https://*.grove.place"],
```

#### Fix 2: Add "what-are-passkeys" to the article list

Create the article first (in `apps/landing/src/content/knowledge/help/what-are-passkeys.md`), then add the slug to `WAYSTONE_ARTICLE_SLUGS`:

```typescript
const WAYSTONE_ARTICLE_SLUGS = [
	// ... existing slugs ...
	"what-are-passkeys",
];
```

#### Fix 3: Verify login app.css includes engine CSS variables

Ensure `apps/login/src/app.css` imports or defines the CSS custom properties that Waystone components depend on.

---

## 7. Meadow Auth Integration

**Character**: The social feed's connection to the authentication forest — architecturally sound, but dependent on healthy root systems.

### Safari findings: What exists today

**Auth flow from meadow** (`apps/meadow/src/routes/feed/+layout.svelte`):

```svelte
import {buildLoginUrl} from '@autumnsgrove/lattice/grafts/login'; ... signInHref={buildLoginUrl(
	`${page.url.origin}/auth/callback?returnTo=...`,
)}
```

This correctly builds: `https://login.grove.place?redirect=https://meadow.grove.place/auth/callback?returnTo=/feed`

**Callback handler** (`apps/meadow/src/routes/auth/callback/+server.ts`):

```typescript
import { createCallbackHandler } from "@autumnsgrove/lattice/grafts/login/server";
export const GET = createCallbackHandler({ defaultReturnTo: "/feed" });
```

Uses the engine's factory. Clean.

**The callback handler** (`libs/engine/src/lib/grafts/login/server/callback.ts`):

- Checks for OAuth errors
- Verifies session cookie exists (`better-auth.session_token` / `__Secure-` variant)
- Redirects to `returnTo` on success
- Redirects to `/auth/login` on failure

- [x] Uses engine's `createCallbackHandler` factory (DRY)
- [x] Auth redirect builds correctly via `buildLoginUrl()`
- [x] Session cookie check on callback
- [ ] **Callback redirect on failure goes to `/auth/login`** — but meadow doesn't have an `/auth/login` route. This would 404 on failure.
- [ ] **No visible "Sign In" button on meadow's main page** — users must navigate to the feed to discover auth-gated actions

### Design spec (safari-approved)

#### Fix 1: Add error redirect path for meadow

Either:

- Create `apps/meadow/src/routes/auth/login/+page.svelte` (redirects to login hub)
- OR pass a custom error redirect in the callback config:

```typescript
export const GET = createCallbackHandler({
	defaultReturnTo: "/feed",
	errorRedirect: "https://login.grove.place",
});
```

(The `createCallbackHandler` would need to support this option.)

#### Fix 2: Add sign-in affordance to meadow's home page

Meadow's `+page.svelte` has "Open the Feed" and "Plant Your Blog" buttons. Add a "Sign In" link in the header for users who are already logged in elsewhere but want to establish their session on meadow.

---

## Expedition Summary

### By the numbers

| Metric          | Count |
| --------------- | ----- |
| Total stops     | 7     |
| Thriving        | 0     |
| Growing         | 2     |
| Wilting         | 2     |
| Barren          | 3     |
| Total fix items | 13    |

### Cross-cutting theme: AUTH service binding is the water main

Three of four reported issues trace to the AUTH service binding. This is the single most impactful fix:

1. **Verify** the `AUTH = groveauth` service binding in Cloudflare Dashboard for BOTH:
   - Pages > grove-login > Settings > Functions > Service bindings
   - Pages > grove-meadow > Settings > Functions > Service bindings

2. **Test** by hitting `https://login.grove.place/health` and checking if it can reach Heartwood

3. **If the binding is correctly configured but still failing**, check:
   - Was the groveauth worker recently redeployed or renamed?
   - Is the groveauth worker healthy? Check its logs in Cloudflare Dashboard
   - Are the environment variables set on the groveauth worker (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET, AUTH_BASE_URL, etc.)?

### Recommended fix order

| Priority | Fix                                      | Impact          | Effort |
| -------- | ---------------------------------------- | --------------- | ------ |
| 1        | Verify AUTH service bindings (Dashboard) | Unblocks ALL    | 5 min  |
| 2        | Add `grove.place` to CSP `connect-src`   | Fixes waystones | 1 min  |
| 3        | Add `what-are-passkeys` slug + article   | Fixes waystone  | 15 min |
| 4        | Add diagnostic logging to Google action  | Debugging       | 5 min  |
| 5        | Improve passkey error surfacing          | UX              | 10 min |
| 6        | Fix meadow callback error redirect       | UX              | 5 min  |
| 7        | Add session validation error visibility  | UX              | 10 min |

---

_The fire dies to embers. The journal is full — 7 stops, 13 fixes sketched, the whole landscape mapped. The root cause is clear: one broken water main feeding three dry faucets, plus a CSP wall blocking the waystones. Tomorrow, the animals go to work. But tonight? Tonight was the drive. And it was glorious._
