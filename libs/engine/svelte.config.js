import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// In CI builds, we don't have wrangler authentication.
// The AI binding (added for Petal) requires remote Cloudflare access -
// it can't be emulated locally and wrangler will error without auth.
// We skip prerendering in CI since it tries to emulate all bindings.
const isCI = process.env.CI === "true";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),

    // Disable SvelteKit's built-in CSRF origin check for two reasons:
    //
    // 1. No wildcard support in SvelteKit 2.50.2 — respond.js line 93 uses
    //    Array.includes() for trustedOrigins matching. "https://*.grove.place"
    //    is compared literally and never matches "https://autumn.grove.place".
    //    This blocks multipart/form-data uploads (images) with a 403.
    //
    // 2. Proxy-incompatible — SvelteKit compares Origin against url.origin,
    //    which behind grove-router is the internal worker URL (pages.dev),
    //    not the user-facing subdomain. Multi-tenant subdomains can't be
    //    enumerated in a static array.
    //
    // Defense in depth: hooks.server.ts provides comprehensive CSRF validation
    // (tested in tests/integration/hooks/csrf.test.ts):
    // - Origin vs X-Forwarded-Host matching (proxy-safe)
    // - Session-bound HMAC tokens (timing-safe comparison)
    // - Token fallback when Origin is absent (fail-closed)
    csrf: {
      checkOrigin: false,
    },
    prerender: {
      // In CI, skip prerendering - the AI binding requires remote auth
      // that's not available in GitHub Actions. At runtime on Cloudflare,
      // all bindings are available. Prerendering would only help with
      // static routes which are already fast server-rendered.
      entries: isCI ? [] : ["*"],
      handleHttpError: ({ path, referrer, message }) => {
        // Ignore 404s for content pages - content is provided by consuming sites
        if (message.includes("404")) {
          console.warn(`Prerender skipping ${path}: ${message}`);
          return;
        }
        // Throw other errors
        throw new Error(message);
      },
      // In CI, ignore routes with `prerender = true` that weren't crawled
      // (since we use entries: [] to skip prerendering entirely)
      handleUnseenRoutes: isCI ? "ignore" : "fail",
    },
  },
};

export default config;
