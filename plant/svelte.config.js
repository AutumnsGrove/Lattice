import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ["/*"],
        exclude: ["<all>"],
      },
    }),
    // Disable built-in CSRF check - we handle it in hooks.server.ts
    // with explicit allowed origins for Cloudflare Pages custom domains
    csrf: {
      trustedOrigins: ["*"],
    },
  },
};

export default config;
