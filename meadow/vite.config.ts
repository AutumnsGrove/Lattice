import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5175,
  },
  optimizeDeps: {
    exclude: ["@jsquash/jxl"],
  },
  build: {
    rollupOptions: {
      external: ["@jsquash/jxl"],
    },
  },
});
