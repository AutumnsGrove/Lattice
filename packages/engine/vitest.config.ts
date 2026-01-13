import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/**
 * Vitest Configuration for GroveEngine
 *
 * Uses happy-dom for DOM simulation and supports both unit tests
 * and component tests. For full DO integration tests, use the
 * post-migrator package which has compatible vitest version.
 */
export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./tests/utils/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "dist/**", "**/*.d.ts", "tests/**"],
    },
  },
  resolve: {
    alias: {
      $lib: "/src/lib",
      "$lib/*": "/src/lib/*",
    },
  },
});
