import js from "@eslint/js";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import oxlint from "eslint-plugin-oxlint";
import globals from "globals";

export default tseslint.config(
	// Global ignores
	{
		ignores: [
			"**/dist/**",
			"**/.svelte-kit/**",
			"**/build/**",
			"**/*.d.ts",
			// Deprecated / archived code — not actively maintained, don't lint it
			"**/_deprecated/**",
			"**/_archived/**",
			"**/archived/**",
			// Generated / vendored files
			"**/node_modules/**",
			// Cloudflare build artifacts
			"**/.wrangler/**",
			// Test coverage output
			"**/coverage/**",
			// Python virtualenv in tools
			"tools/glimpse/.venv/**",
			// eslint-plugin-svelte doesn't support <svelte:boundary> yet (parser crash)
			"**/PassageTransition.svelte",
			"apps/landing/src/routes/vineyard/+page.svelte",
		],
	},

	// JS / TypeScript files — recommended rules
	js.configs.recommended,
	...tseslint.configs.recommended,

	// Turn off ESLint rules that Oxlint already covers.
	// Oxlint runs those same rules 50-100x faster in Rust — no point doubling up.
	oxlint.configs["flat/recommended"],

	// Explicit overrides for rules Oxlint owns that may slip through the mapping.
	// Keep this list short — if it grows, something is wrong with the oxlint plugin.
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off", // oxlint: typescript/no-explicit-any
			"no-unused-vars": "off", // oxlint: no-unused-vars (prefer TS version)
			"@typescript-eslint/no-unused-vars": "off", // oxlint: typescript/no-unused-vars

			// TypeScript handles undefined variable checking at compile time via @types/*
			// and lib.dom.d.ts — no-undef in ESLint is redundant and produces false
			// positives for every global TypeScript knows about. This is the canonical
			// recommendation from the typescript-eslint team.
			"no-undef": "off",

			// CJS require() is used in some Cloudflare Worker scripts and build tools.
			// Address gradually — warn rather than error until cleaned up.
			"@typescript-eslint/no-require-imports": "warn",
		},
	},

	// Tailwind / PostCSS configs use CJS require() for plugins — this is intentional
	// and expected for the CommonJS config format these tools use.
	{
		files: ["**/tailwind.config.{js,cjs}", "**/postcss.config.{js,cjs}"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},

	// Node.js scripts (.mjs build/sync scripts in workers and scripts/)
	// ESLint doesn't know their runtime environment without this.
	{
		files: ["**/*.mjs", "**/scripts/**/*.{js,ts}", "**/workers/*/scripts/**"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},

	// Svelte files — eslint-plugin-svelte handles template-aware linting:
	// reactive statements, runes, unused props, a11y, and more.
	...svelte.configs["flat/recommended"],
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parserOptions: {
				// Wire up typescript-eslint inside <script lang="ts"> blocks
				parser: tseslint.parser,
			},
		},
	},
);
