import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/lib/test-mocks/setup.ts"],
    alias: {
      $lib: "/src/lib",
      // Mock SvelteKit modules for vitest (used by engine package components)
      "$app/environment": path.resolve(
        "./src/lib/test-mocks/app-environment.ts",
      ),
      "$app/navigation": path.resolve("./src/lib/test-mocks/app-navigation.ts"),
      "$app/stores": path.resolve("./src/lib/test-mocks/app-stores.ts"),
    },
  },
  resolve: {
    // Ensure Svelte resolves to client-side code in tests
    conditions: ["browser", "svelte"],
  },
});
