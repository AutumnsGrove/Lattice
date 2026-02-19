<script lang="ts">
	import GroveTerm from './GroveTerm.svelte';
	import { groveModeStore } from '$lib/ui/stores';
	import type { GroveTermManifest } from './types';

	import defaultManifestData from '$lib/data/grove-term-manifest.json';
	const defaultManifest = defaultManifestData as GroveTermManifest;

	// GroveIntro - Standardized inverse-term page introduction
	//
	// Always shows the OPPOSITE term from what the heading displays,
	// so users naturally learn both names:
	//   - Grove Mode OFF: heading shows "Support", subtitle shows "we call it the Porch"
	//   - Grove Mode ON: heading shows "Porch", subtitle shows "also known as Support"
	//
	// Usage:
	//   <h1><GroveSwap term="porch">Porch</GroveSwap></h1>
	//   <GroveIntro term="porch" />

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

	// Show when: term has both a grove term and a standard term, and is not alwaysGrove
	const shouldShow = $derived(
		entry && entry.standardTerm && !entry.alwaysGrove
	);

	const isGroveMode = $derived(groveModeStore.current);
</script>

{#if shouldShow && entry}
	<p class="grove-intro text-sm text-foreground-subtle italic {className || ''}">
		{#if isGroveMode}
			also known as <GroveTerm term={term} displayOverride="standard" {manifest} />
		{:else}
			we call it the <GroveTerm term={term} displayOverride="grove" {manifest} />
		{/if}
	</p>
{/if}

<style>
	.grove-intro {
		margin-top: 0.25rem;
		margin-bottom: 0;
	}
</style>
