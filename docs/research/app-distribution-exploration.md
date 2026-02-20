# App Distribution Exploration

> How do we get Grove into app stores without maintaining separate codebases?

**Date:** 2026-02-19
**Status:** Exploration / Decision pending
**Context:** Grove is a SvelteKit web app deployed on Cloudflare Pages/Workers. We want presence in the iOS App Store and Google Play Store while remaining a one-person operation with a single codebase.

---

## The Problem

Grove lives on the web. That works for people who live in browsers, but a lot of people expect apps. "Install it as a PWA" is technically possible but confusing for most people — the steps are buried in browser menus and the concept is unfamiliar. The simplest distribution path for most users is the App Store.

We don't need native features for their own sake. Grove is deliberately anti-notification-spam, anti-engagement-bait. This isn't about push notifications or sensor access. It's about **distribution** — being where people look for software.

### What We're Working With

- **Framework:** SvelteKit 2.50+ with Svelte 5
- **Deployment:** Cloudflare Pages + Workers (adapter-cloudflare)
- **Auth:** Heartwood (Google OAuth 2.0 + PKCE) via service bindings
- **Architecture:** Multi-tenant with subdomain routing through grove-router
- **Existing PWA setup:** Web manifests, icons (192/512px), apple-touch-icon, standalone display mode — but **no service workers** and no offline support
- **Monorepo:** 10 apps, 10 services, 7 workers, shared engine library

---

## Options Evaluated

### 1. Capacitor (Ionic) — Bundled Static Build

**What it is:** A framework-agnostic tool that wraps a web app in a native WebView container. You build your SvelteKit app with `adapter-static` (SPA mode), and Capacitor copies it into native iOS/Android project shells.

**How it works with SvelteKit:**

1. Add a second SvelteKit config that uses `adapter-static` with SSR disabled
2. Build to static output (HTML/CSS/JS bundle)
3. `npx cap sync` copies the build into native Xcode/Android Studio projects
4. The app talks to your live Cloudflare API for data
5. Submit to stores via Xcode and Android Studio

**Pros:**

- First-class SvelteKit support, well-documented by multiple developers
- Large, mature plugin ecosystem (push notifications, biometrics, haptics, share sheet, etc.)
- JavaScript-only — no Rust or other toolchain needed
- Same codebase, two build targets (web: adapter-cloudflare, mobile: adapter-static)
- Capgo ($12/mo) enables over-the-air updates without store re-submission

**Cons:**

- Requires maintaining a dual adapter setup
- iOS builds require a Mac and Xcode
- API routes (`+server.ts`) don't work in static builds — mobile app must call hosted API
- Apple's Guideline 4.2 means we can't ship a bare wrapper (see below)

**Verdict:** Best overall option for iOS + Android. The plugin ecosystem solves the Apple review problem.

### 2. Tauri v2

**What it is:** A Rust-based alternative to Electron with mobile support added in v2 (stable October 2024).

**How it works with SvelteKit:** Similar to Capacitor — disable SSR, build to static, bundle into native shell. Official SvelteKit docs exist. Uses system WebView.

**Pros:**

- Smaller binary sizes than Capacitor
- Rust backend allows on-device computation if needed later
- Active development, growing community

**Cons:**

- Requires the Rust toolchain (added build complexity for a wrapper use case)
- Mobile plugin ecosystem is smaller and less mature
- The Tauri team has acknowledged they "overpromised mobile as a first-class citizen"
- Documentation has gaps for mobile-specific workflows
- More maintenance burden for what's essentially a branded WebView

**Verdict:** Overkill for our use case. Tauri shines when you need on-device Rust logic. For a web wrapper with some native polish, the Rust toolchain is unnecessary complexity.

### 3. PWA + TWA (Trusted Web Activity)

**PWA on iOS:** Users can install to Home Screen via Safari's Share menu. iOS PWA support has improved (web push since iOS 16.4, iOS 26 defaults sites to web app mode), but there's no install prompt, no App Store listing possible, and many users won't go through the manual flow.

**TWA on Android:** A Trusted Web Activity uses Chrome's engine (not a WebView) to render your site without browser UI, packaged as a Play Store app. It auto-updates when your website updates — zero maintenance after initial setup.

**Pros (TWA for Android):**

- Zero maintenance after setup — app updates when the website updates
- $25 one-time Google Play fee
- Uses real Chrome engine, not a degraded WebView
- Bubblewrap CLI or PWABuilder makes setup straightforward

**Cons:**

- Android-only — no iOS equivalent exists
- PWA alone cannot get into the iOS App Store
- Requires Lighthouse score 80+ and Digital Asset Links

**Verdict:** TWA is the ideal Android solution. For iOS, we still need Capacitor.

### 4. Capacitor with Remote URL

**What it is:** Point Capacitor's WebView at your live URL instead of bundling files.

```json
{
	"server": {
		"url": "https://grove.place"
	}
}
```

**Why not:**

- `server.url` was designed for development live-reload, not production
- Capacitor plugins break (fall back to web implementations)
- Platform detection (`Capacitor.getPlatform()`) may report "web" instead of native
- Apple will almost certainly reject it under Guideline 4.2
- No offline fallback (network drops = white screen)

**Verdict:** Not viable for production or store approval.

---

## The Apple Problem: Guideline 4.2

Apple's App Store Review Guideline 4.2 (Minimum Functionality) rejects apps that are "just a website wrapped in a WebView." The reviewer's question: **"Why does this need to be an app instead of a bookmark?"**

### What Gets Rejected

- A WebView loading a URL with no native integration
- Browser-like loading bars visible in the app
- Web-only navigation (hamburger menus, no native patterns)
- No offline handling
- No device capabilities used

### What Gets Approved

Apps that use WebViews for content but wrap them in a native experience. Amazon, Instagram, and Basecamp all use WebViews extensively — the technology isn't the problem.

### Minimum Viable Native Features

Based on multiple sources and real-world approval stories, aim for 3-4 clearly visible native features. Ranked by impact-to-effort for our use case:

**High impact, low effort:**

1. **Offline fallback screen** — Branded "you're offline, here's what you last saw" instead of a white page. A basic service worker handles this.
2. **Biometric login** — Face ID / Touch ID via `@capacitor-community/biometric-auth`. Visible immediately on launch.
3. **Native share sheet** — `@capacitor/share` for sharing posts through the OS share menu.
4. **Status bar integration** — `@capacitor/status-bar` for proper iOS appearance.

**Medium impact, medium effort:**

5. **Haptic feedback** — `@capacitor/haptics` for tactile responses.
6. **Native preferences** — `@capacitor/preferences` for persisting settings.

**Deliberately excluded:**

- **Push notifications** — While this is the strongest signal to Apple reviewers, Grove's philosophy is anti-notification-spam. We'd only add these if we find a use case that's genuinely helpful (like "someone replied to your comment") rather than engagement-driven.

### Review Submission Tips

- In App Review Notes, explicitly list every native feature
- Provide a demo account with credentials
- Apple reviewers spend ~2 minutes on an app — features must be immediately visible
- Apple has been raising the bar over time

---

## Recommended Strategy

### Two-Track Approach

**Android: TWA via Bubblewrap**

- Package the existing PWA as a Trusted Web Activity
- One-time setup, auto-updates when the website updates
- $25 one-time Google Play Console fee
- Near-zero ongoing maintenance
- Gets us into the Play Store with minimal effort

**iOS: Capacitor with bundled static build**

- Add a second SvelteKit build config using `adapter-static`
- Add biometric login, offline fallback, share sheet, and status bar integration
- Bundle the static build inside the app shell
- Consider Capgo ($12/mo) for OTA updates without re-submission
- $99/year Apple Developer Program

### Why Two Tracks Instead of Capacitor for Both?

For Android, TWA is genuinely zero-maintenance — the app updates when the website does. Capacitor Android still needs `cap sync` + rebuild cycles. The TWA advantage is real for a solo developer. That said, if maintaining a single native toolchain matters more, Capacitor for both is reasonable.

### Prerequisites Before Starting

1. **Add service workers** — We have none currently. Both tracks benefit from offline caching.
2. **Add `adapter-static` build config** — The iOS track needs this. Create a separate SvelteKit config or a build-time flag.
3. **Decouple API calls** — Mobile app can't use `+server.ts` routes in a static build. API calls need to go to the hosted Cloudflare API directly.
4. **Add CORS headers to API routes** — Cloudflare Workers currently assume same-origin requests. A Capacitor WebView hitting `https://meadow.grove.place/api/feed` is cross-origin — API routes need `Access-Control-Allow-Origin` headers and proper preflight handling.
5. **Set up Digital Asset Links** — TWA requires `.well-known/assetlinks.json` on the domain, plus a Lighthouse score of 80+ for the PWA quality bar.
6. **Get a Mac** — iOS builds require Xcode, which only runs on macOS. Cloud Mac services (MacStadium) are an alternative at ~$50-80/mo.

---

## Cost Summary

| Approach                   | Year 1             | Ongoing/Year |
| -------------------------- | ------------------ | ------------ |
| PWA only (status quo)      | $0                 | $0           |
| + TWA for Android          | $25                | $0           |
| + Capacitor for iOS        | $124 ($99 + $25)   | $99          |
| + Capgo OTA updates        | $268 ($124 + $144) | $243         |
| Managed service (MobiLoud) | $2,500+            | $2,500+      |

The managed service option (MobiLoud, Median.co) handles wrapper building, native features, and Apple review for you. It trades money for time — potentially worth it if dealing with Xcode and Apple reviewers would pull focus from building the actual product. MobiLoud guarantees App Store approval.

---

## What Actually Needs to Change in the Codebase

The good news: **we don't need to rewrite anything.** SvelteKit was the right choice. The web app stays exactly as-is on Cloudflare. We're adding a distribution layer alongside it — same codebase, second build target.

That said, there's real work to do. Here's what "API decoupling" means concretely and why it matters.

### The Core Problem: Server vs. Static

Right now, every Grove app runs as a **Cloudflare Worker** (via `adapter-cloudflare`). Pages fetch data in two ways:

1. **SSR load functions** (`+page.server.ts`) — these run on the server and access D1 databases, service bindings, and auth state directly via `platform.env`
2. **Client-side fetch** to `+server.ts` API routes — these also run on the server

A Capacitor app is a **static bundle** (HTML/CSS/JS in a WebView). There's no server. So:

- `+page.server.ts` files don't execute — there's no Cloudflare Worker runtime
- `+server.ts` API routes don't exist — there's no server to handle them
- `platform.env.AUTH`, `platform.env.DB`, `platform.env.THRESHOLD` — none of this exists outside Workers

**The mobile app needs to get all its data by calling the live Cloudflare deployment over HTTPS.** The website keeps working exactly as it does today. The mobile app just talks to it as an API.

### What Changes, Concretely

#### 1. Add a Service Worker (benefits web + mobile)

We have PWA manifests and icons but **no service workers** anywhere. We need one for:

- Offline fallback screen (required for Apple review)
- Caching recently viewed content
- Better perceived performance on mobile

SvelteKit has built-in service worker support via `src/service-worker.ts`. This is maybe 60-80 lines of code.

**Files to create:**

- `apps/meadow/src/service-worker.ts` (start with Meadow since it's the social hub)
- Eventually one per app that goes into the mobile build

#### 2. Create a Mobile API Client

The good news: **most of the API routes already exist.** Meadow has `/api/feed`, `/api/feed/[id]/vote`, `/api/bookmarks`, `/api/following`, etc. These are already REST endpoints that return JSON. The mobile app just needs to call them at their public URLs instead of relative paths.

What we need is a shared API client that:

- Calls `https://meadow.grove.place/api/feed` instead of `/api/feed`
- Passes auth tokens in `Authorization` headers instead of relying on cookies
- Handles token refresh when sessions expire
- Works from both the web (as a progressive enhancement) and Capacitor

**Where it lives:** Something like `packages/engine/src/lib/api-client/` or a new `packages/grove-api/` package.

**The pattern change:**

```typescript
// Current (web, relative URL, cookies automatic):
const res = await fetch("/api/feed?filter=latest", {
	credentials: "include",
});

// Mobile (absolute URL, explicit auth token):
const res = await fetch("https://meadow.grove.place/api/feed?filter=latest", {
	headers: { Authorization: `Bearer ${token}` },
});
```

A thin wrapper abstracts this so components don't care which environment they're in.

#### 3. Add Token-Based Auth to Heartwood

This is the biggest actual change. Right now auth works like this:

1. User logs in via Google OAuth → Heartwood sets a `grove_session` cookie
2. Every request: `hooks.server.ts` validates the cookie via `platform.env.AUTH.fetch()` (service binding)
3. API routes check `locals.user` (populated by hooks)

Capacitor can't use this flow because:

- **Service bindings** (`platform.env.AUTH`) only work inside Cloudflare's internal mesh
- **Cookies** don't transfer cleanly between a WebView and a different domain

We need Heartwood to also support **bearer tokens**:

1. After OAuth callback, Heartwood returns a JWT or opaque token (in addition to the cookie)
2. Mobile app stores the token in secure storage (`@capacitor-community/secure-storage`)
3. Mobile app sends `Authorization: Bearer <token>` with every request
4. API routes accept either cookies (web) OR bearer tokens (mobile)

**Files to modify:**

- `services/groveauth/` — add token issuance endpoint, add bearer token validation
- `apps/meadow/src/hooks.server.ts` — accept `Authorization` header as alternative to cookie
- Same pattern for every app's `hooks.server.ts`

This is the most significant piece of work, but it also makes the API more versatile for future integrations (third-party clients, CLI tools, etc.).

**WebView OAuth caveat:** The standard Google OAuth redirect flow won't work inside a Capacitor WebView — a browser redirect can't close the WebView and return a token to the app. The mobile flow needs either `@capacitor/browser` with a deep-link callback URL (custom scheme like `grove://auth/callback`) or `ASWebAuthenticationSession` on iOS. This is real implementation work that should be scoped alongside the Heartwood bearer token changes.

#### 4. Dual Build Configuration

We need a way to build any Grove app in two modes:

- **Web mode** (existing): `adapter-cloudflare`, SSR, server routes, service bindings
- **Mobile mode** (new): `adapter-static`, SPA, no server routes, API client

This could be a build-time environment variable:

```javascript
// svelte.config.js
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';

const isMobile = process.env.BUILD_TARGET === 'mobile';

const config = {
  kit: {
    adapter: isMobile ? adapterStatic({ fallback: 'index.html' }) : adapterCloudflare({...}),
  }
};
```

Note: SvelteKit's `ssr` setting is not a kit config option — it's controlled per-route via `+layout.ts`. For the mobile build, add a root layout file:

```typescript
// src/routes/+layout.ts (only in mobile builds)
export const ssr = false;
export const prerender = true;
```

**Files to modify:**

- `apps/meadow/svelte.config.js` (and whichever apps go into the mobile build)
- Add `adapter-static` as a dev dependency

#### 5. Capacitor Project Shell

Once the above is in place, the Capacitor setup is straightforward:

```
apps/grove-mobile/           # New Capacitor project
├── capacitor.config.ts      # Points to Meadow's static build output
├── ios/                     # Generated by `cap init`, opened in Xcode
├── android/                 # Generated by `cap init`, opened in Android Studio
├── package.json
└── src/
    └── native/              # Native plugin integrations
        ├── biometrics.ts    # @capacitor-community/biometric-auth
        ├── share.ts         # @capacitor/share
        ├── status-bar.ts    # @capacitor/status-bar
        └── haptics.ts       # @capacitor/haptics
```

The native features (biometrics, share sheet, status bar, haptics) are mostly plugin configuration — each one is maybe 20-50 lines of integration code.

### What Stays Exactly the Same

- **The web deployment** — nothing changes for grove.place
- **The Cloudflare Workers** — all services keep running as-is
- **The database layer** — D1, KV, R2 are untouched
- **The component library** — Svelte components work identically in static builds
- **The design system** — glassmorphism, seasons, forests — all CSS/Svelte, all portable

### Implementation Order (Phased)

**Phase 1: Foundation** (web-only, benefits everyone)

1. Add service workers for offline support
2. Add bearer token auth to Heartwood (alongside existing cookie auth)
3. Create shared API client in engine

**Phase 2: Android** (quickest store win) 4. Ensure PWA manifest + service worker score 80+ on Lighthouse 5. Package as TWA via Bubblewrap 6. Submit to Google Play ($25)

**Phase 3: iOS** (the real goal) 7. Add `adapter-static` dual build config 8. Initialize Capacitor project 9. Integrate native plugins (biometrics, share, status bar, haptics) 10. Add selective notifications (replies, mentions — not engagement bait) 11. Register for Apple Developer Program ($99) 12. Build in Xcode, submit to App Store

Phase 1 improves the web experience too. Phase 2 is a quick win. Phase 3 is where the real effort lives but is entirely achievable.

---

## References

- [Ionic: Cross-Platform SvelteKit & Capacitor](https://ionic.io/blog/cross-platform-sveltekit-capacitor-application-yes-its-possible)
- [Stanislav Khromov: SvelteKit + Capacitor App](https://khromov.se/how-i-published-a-gratitude-journaling-app-for-ios-and-android-using-sveltekit-and-capacitor/)
- [Bryan Hogan: Web to Native with SvelteKit & Capacitor](https://bryanhogan.com/blog/web-to-app-sveltekit-capacitor)
- [Capgo: SvelteKit + Capacitor Tutorial](https://capgo.app/blog/creating-mobile-apps-with-sveltekit-and-capacitor/)
- [Tauri v2 SvelteKit Frontend Guide](https://v2.tauri.app/start/frontend/sveltekit/)
- [Google: Adding Your PWA to Google Play](https://developers.google.com/codelabs/pwa-in-play)
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- [Apple Developer Forums: Guideline 4.2](https://developer.apple.com/forums/thread/806726)
- [MobiLoud: WebView App Store Guidelines](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)
- [Median: Will Apple Approve My WebView App?](https://median.co/blog/will-apple-approve-my-webview-app)
