<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { GroveTermManifest } from './types';
	import { groveModeStore } from '$lib/ui/stores';

	import defaultManifestData from '$lib/data/grove-term-manifest.json';
	const defaultManifest = defaultManifestData as GroveTermManifest;

	// GroveSwap - Silent text swap based on grove mode
	//
	// Zero-chrome component: no popup, no underline, no interactivity.
	// Just reactive text that swaps between grove and standard terms.
	//
	// Usage:
	//   No <GroveSwap term="bloom">blooms</GroveSwap> yet.
	//   <!-- grove mode ON: "No blooms yet." / OFF: "No posts yet." -->

	interface Props {
		/** Term slug to look up (e.g., "bloom", "arbor") */
		term: string;
		/** Explicit standard term override (skips manifest lookup) */
		standard?: string;
		/** Static manifest for build-time lookup (optional) */
		manifest?: GroveTermManifest;
		/** Grove-mode display text (overrides manifest term) */
		children?: Snippet;
	}

	let { term, standard, manifest = defaultManifest, children }: Props = $props();

	// Normalize term to slug format
	const slug = $derived(term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

	// Try common slug variations (same logic as GroveTerm)
	function findInManifest(m: GroveTermManifest, s: string) {
		if (s in m) return m[s];
		if (`your-${s}` in m) return m[`your-${s}`];
		if (`${s}s` in m) return m[`${s}s`];
		if (s.endsWith('s') && s.slice(0, -1) in m) return m[s.slice(0, -1)];
		return null;
	}

	const entry = $derived(findInManifest(manifest, slug));
	const showGrove = $derived(
		groveModeStore.current || entry?.alwaysGrove || (!standard && !entry?.standardTerm)
	);
</script>

{#if showGrove}{#if children}{@render children()}{:else}{entry?.term || term}{/if}{:else}{standard || entry?.standardTerm || term}{/if}
