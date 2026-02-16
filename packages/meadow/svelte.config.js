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
      checkOrigin: true,
      trustedOrigins: [
        "https://grove.place",
        "https://*.grove.place",
        "http://localhost:*",
        "http://127.0.0.1:*",
      ],
    },
  },
};

export default config;
