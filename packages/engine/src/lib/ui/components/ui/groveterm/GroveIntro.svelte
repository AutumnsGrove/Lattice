<script lang="ts">
	import GroveTerm from './GroveTerm.svelte';
	import { groveModeStore } from '$lib/ui/stores';
	import type { GroveTermManifest } from './types';

	import defaultManifestData from '$lib/data/grove-term-manifest.json';
	const defaultManifest = defaultManifestData as GroveTermManifest;

	// GroveIntro - Standardized "we call it X" page introduction
	//
	// Renders below a page title when Grove Mode is OFF, introducing the
	// Grove term for the feature. Hidden entirely when Grove Mode is ON.
	//
	// Usage:
	//   <h1>Support</h1>
	//   <GroveIntro term="porch" />
	//   <!-- Renders: "we call it the Porch" with Porch as interactive GroveTerm -->

	interface Props {
		/** Term slug to look up (e.g., "porch", "arbor") */
		term: string;
		/** Optional manifest override */
		manifest?: GroveTermManifest;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		term,
		manifest = defaultManifest,
		class: className
	}: Props = $props();

	// Direct manifest lookup — callers should pass the exact manifest slug
	const entry = $derived(term in manifest ? manifest[term] : null);

	// Only show when: Grove Mode is OFF, and the term has a standardTerm, and is not alwaysGrove
	const shouldShow = $derived(
		!groveModeStore.current && entry && entry.standardTerm && !entry.alwaysGrove
	);
</script>

{#if shouldShow && entry}
	<p class="grove-intro text-sm text-foreground-subtle italic {className || ''}">
		we call it the <GroveTerm term={term} {manifest} />
	</p>
{/if}

<style>
	.grove-intro {
		margin-top: 0.25rem;
		margin-bottom: 0;
	}
</style>
