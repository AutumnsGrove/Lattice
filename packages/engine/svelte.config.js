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

    // SvelteKit's built-in CSRF protection needs explicit trusted origins because
    // behind grove-router proxy, Origin and Host headers mismatch. Our hooks.server.ts
    // provides additional proxy-aware CSRF validation for all requests.
    csrf: {
      trustedOrigins: [
        "https://grove.place",
        "https://*.grove.place",
        "http://localhost:*",
        "http://127.0.0.1:*",
      ],
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
