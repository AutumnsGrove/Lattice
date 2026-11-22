import { sveltekit } from "@sveltejs/kit/vite";

/**
 * Creates a base Vite config for Grove SvelteKit apps.
 *
 * Includes: SvelteKit plugin, Lucide SSR noExternal.
 * Pass overrides to extend (arrays are concatenated, objects deep-merged).
 *
 * @param {import('vite').UserConfig} overrides
 * @returns {import('vite').UserConfig}
 */
export function createGroveViteConfig(overrides = {}) {
	const base = {
		plugins: [sveltekit()],
		ssr: {
			noExternal: ["@lucide/svelte", /^@autumnsgrove\//],
		},
	};

	return deepMergeConfig(base, overrides);
}

/**
 * @param {Record<string, any>} base
 * @param {Record<string, any>} overrides
 * @returns {Record<string, any>}
 */
function deepMergeConfig(base, overrides) {
	const result = { ...base };

	for (const [key, value] of Object.entries(overrides)) {
		const baseVal = result[key];
		if (Array.isArray(value) && Array.isArray(baseVal)) {
			result[key] = [...baseVal, ...value];
		} else if (
			value &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			baseVal &&
			typeof baseVal === "object"
		) {
			result[key] = deepMergeConfig(baseVal, value);
		} else {
			result[key] = value;
		}
	}

	return result;
}
