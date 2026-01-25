import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

const __dirname = new URL(".", import.meta.url).pathname;

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
    // Use browser condition for Svelte 5 component testing
    // Without this, vitest imports svelte/src/index-server.js which lacks mount()
    conditions: ["browser"],
    alias: {
      $lib: "/src/lib",
      "$lib/*": "/src/lib/*",
      // SvelteKit virtual modules need stubs for vitest
      "$app/stores": resolve(__dirname, "tests/mocks/app-stores.ts"),
      "$app/navigation": resolve(__dirname, "tests/mocks/app-navigation.ts"),
      "$app/environment": resolve(__dirname, "tests/mocks/app-environment.ts"),
    },
  },
});
