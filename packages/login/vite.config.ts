import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    exclude: ["@jsquash/jxl"],
  },
  build: {
    rollupOptions: {
      external: ["@jsquash/jxl"],
    },
  },
});
