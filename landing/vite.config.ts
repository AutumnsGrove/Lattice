import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ["workers-og", "@autumnsgrove/gossamer", "@jsquash/jxl"],
  },
  build: {
    rollupOptions: {
      external: ["workers-og", "@jsquash/jxl"],
    },
  },
  ssr: {
    // These packages ship .svelte files that need processing during SSR
    noExternal: [
      "lucide-svelte",
      "@lucide/svelte",
      "@tabler/icons-svelte",
      "@autumnsgrove/gossamer",
    ],
  },
});
