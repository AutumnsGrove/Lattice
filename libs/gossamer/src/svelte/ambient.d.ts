/**
 * Ambient declarations for Svelte component imports.
 *
 * Without SvelteKit's generated tsconfig, plain `tsc` cannot resolve
 * `.svelte` file imports. This shim declares all `.svelte` files as
 * valid modules exporting a Svelte component, which satisfies `tsc`
 * while `svelte-check` handles the real deep type-checking.
 */
declare module "*.svelte" {
	import type { Component } from "svelte";
	const component: Component<Record<string, unknown>>;
	export default component;

	// Allow named type exports (e.g., props interfaces)
	export type { component };
}
