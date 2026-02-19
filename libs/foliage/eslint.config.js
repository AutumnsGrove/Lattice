import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import globals from "globals";

export default [
	// Recommended ESLint rules
	eslint.configs.recommended,

	// Ignore patterns
	{
		ignores: ["dist/", "node_modules/", ".svelte-kit/", "*.config.js"],
	},

	// TypeScript files (server-side)
	{
		files: ["src/lib/server/**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: "module",
			},
			globals: {
				...globals.node,
				D1Database: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "warn",
			"no-unused-vars": "off",
			"no-undef": "error",
		},
	},

	// TypeScript files (client-side)
	{
		files: ["src/lib/**/*.ts", "!src/lib/server/**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: "module",
			},
			globals: {
				...globals.browser,
				...globals.es2022,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "warn",
			"no-unused-vars": "off",
			"no-undef": "error",
		},
	},

	// Test files
	{
		files: ["tests/**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: "module",
			},
			globals: {
				...globals.node,
				...globals.es2022,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "warn",
			"no-unused-vars": "off",
			"no-undef": "off",
			"no-console": "off",
		},
	},

	// Svelte files
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsparser,
				extraFileExtensions: [".svelte"],
			},
			globals: {
				...globals.browser,
				...globals.es2022,
			},
		},
		plugins: {
			svelte,
		},
		rules: {
			"svelte/no-unused-svelte-ignore": "warn",
			"svelte/valid-compile": "warn",
			"no-undef": "off",
		},
	},
];
