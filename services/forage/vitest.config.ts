import { defineConfig } from "vitest/config";
import path from "path";

const engineLib = path.resolve(__dirname, "../../libs/engine/src/lib");

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
	resolve: {
		alias: {
			// Map @autumnsgrove/lattice subpath exports to engine source
			"@autumnsgrove/lattice/loom": path.resolve(engineLib, "loom/index.ts"),
			"@autumnsgrove/lattice/errors": path.resolve(engineLib, "errors/index.ts"),
		},
	},
});
