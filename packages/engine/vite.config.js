import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // @ts-expect-error - SvelteKit plugin uses older vite types, safe to ignore
  plugins: [sveltekit()],
  build: {
    // Disable source maps in production to prevent source code exposure
    sourcemap: false,
    rollupOptions: {
      // @jsquash/jxl requires special WASM handling, loaded via CDN/importmap
      external: ["@jsquash/jxl"],
    },
  },
  optimizeDeps: {
    // Exclude workers-og from dependency pre-bundling to prevent issues with Web Workers
    // Workers need to be loaded as separate files and Vite's optimization breaks worker functionality
    // @autumnsgrove/zig-core contains WASM that needs special handling
    exclude: ["workers-og", "@jsquash/jxl", "@autumnsgrove/zig-core"],
  },
  assetsInclude: ["**/*.wasm"],
  server: {
    fs: {
      // Allow serving files from project root directories (dev only)
      allow: [".."],
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    // Use jsdom for component tests, node for server tests
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/lib/server/services/**/*.ts",
        "src/lib/heartwood/**/*.ts",
        "src/lib/payments/**/*.ts",
        "src/lib/utils/**/*.ts",
        "src/lib/ui/components/**/*.{ts,svelte}",
      ],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/types.ts", "**/index.ts"],
    },
  },
});
