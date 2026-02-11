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
    csrf: {
      trustedOrigins: [
        "https://login.grove.place",
        "https://*.grove.place",
        "http://localhost:*",
        "http://127.0.0.1:*",
      ],
    },
    csp: {
      mode: "nonce",
      directives: {
        "default-src": ["self"],
        "script-src": ["self"],
        "style-src": ["self", "unsafe-inline"],
        "img-src": ["self", "data:"],
        "connect-src": ["self", "https://*.grove.place"],
        "frame-ancestors": ["none"],
        "upgrade-insecure-requests": true,
      },
    },
  },
};

export default config;
