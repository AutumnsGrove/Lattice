import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ["workers-og"],
  },
  build: {
    rollupOptions: {
      external: ["workers-og"],
    },
  },
});
