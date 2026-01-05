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
    prerender: {
      handleMissingId: "warn",
      handleHttpError: ({ status, path, referrer, referenceType }) => {
        // Ignore 404 errors, fail on others
        if (status === 404) return;
        throw new Error(`Failed to fetch ${path}: ${status}`);
      },
    },
  },
};

export default config;
