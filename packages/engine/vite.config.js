import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    // Disable source maps in production to prevent source code exposure
    sourcemap: false,
    rollupOptions: {
      external: ["dompurify"],
    },
  },
  server: {
    fs: {
      // Allow serving files from project root directories (dev only)
      allow: [".."],
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/lib/server/services/**/*.ts",
        "src/lib/groveauth/**/*.ts",
        "src/lib/payments/**/*.ts",
        "src/lib/utils/**/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/types.ts", "**/index.ts"],
    },
  },
});
