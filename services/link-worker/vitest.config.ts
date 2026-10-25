import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const engine = resolve(__dirname, "../../libs/engine/src/lib");

// Workspace subpath exports resolve to dist/, which isn't built under vitest — map to source.
export default defineConfig({
	resolve: {
		alias: [
			{
				find: /^@autumnsgrove\/lattice\/services\/(.*)$/,
				replacement: `${engine}/server/services/$1.ts`,
			},
			{
				find: /^@autumnsgrove\/lattice\/platform\/config\/(.*)$/,
				replacement: `${engine}/platform/config/$1.ts`,
			},
			{ find: "@autumnsgrove/lattice/errors", replacement: `${engine}/errors/index.ts` },
		],
	},
	test: {
		globals: true,
		include: ["tests/**/*.test.ts"],
	},
});
