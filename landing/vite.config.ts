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
  ssr: {
    // These packages ship .svelte files that need processing during SSR
    noExternal: ["lucide-svelte", "@lucide/svelte", "@tabler/icons-svelte"],
  },
});
