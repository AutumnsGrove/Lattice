import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    globals: true,
    alias: {
      $lib: resolve(__dirname, "./src/lib"),
      // Mock external icon package for testing
      "@autumnsgrove/lattice/ui/icons": resolve(
        __dirname,
        "./src/lib/__mocks__/icons.ts",
      ),
    },
  },
});
