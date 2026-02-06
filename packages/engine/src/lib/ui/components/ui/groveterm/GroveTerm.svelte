<script lang="ts">
	import { cn } from '$lib/ui/utils';
	import GroveTermPopup from './GroveTermPopup.svelte';
	import type { GroveTermEntry, GroveTermManifest, GroveTermCategory } from './types';
	import type { Snippet } from 'svelte';
	import { groveModeStore } from '$lib/ui/stores';

	// Import manifest internally so consumers don't need to
	import defaultManifestData from '$lib/data/grove-term-manifest.json';
	const defaultManifest = defaultManifestData as GroveTermManifest;

	// GroveTerm - Interactive Grove terminology with popup definitions
	//
	// Mode-aware: when Grove Mode is OFF, shows standard terms for entries
	// that have a standardTerm. When ON (or alwaysGrove), shows Grove terms
	// with the category-colored dotted underline.
	//
	// Usage:
	//   <GroveTerm term="grove" />
	//   <GroveTerm term="wanderer">wanderers</GroveTerm>
	//   <p>Welcome to your <GroveTerm term="grove" /> where <GroveTerm term="bloom">blooms</GroveTerm> grow.</p>

	interface Props {
		/** Term slug to look up (e.g., "grove", "heartwood", "wanderer") */
		term: string;
		/** Display inline with text (default: true) */
		inline?: boolean;
		/** Static manifest for build-time lookup (optional) */
		manifest?: GroveTermManifest;
		/** Additional CSS classes */
		class?: string;
		/** Override display text */
		children?: Snippet;
	}

	let {
		term,
		inline = true,
		class: className,
		manifest = defaultManifest,
		children
	}: Props = $props();

	// State
	let popupOpen = $state(false);
	let entry = $state<GroveTermEntry | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let preloadTimer: ReturnType<typeof setTimeout> | null = null;

	// Cleanup preload timer on unmount to prevent memory leaks
	$effect(() => {
		return () => {
			if (preloadTimer) {
				clearTimeout(preloadTimer);
				preloadTimer = null;
			}
		};
	});

	// Normalize term to slug format
	const slug = $derived(term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

	// Eagerly resolve entry from manifest for mode-aware display
	$effect(() => {
		if (!entry && manifest) {
			const found = findInManifest(manifest, slug);
			if (found) entry = found;
		}
	});

	// Whether this term should show as Grove (interactive underline) or standard (plain)
	const showAsGrove = $derived(
		groveModeStore.current || !entry?.standardTerm || entry?.alwaysGrove
	);

	// Try common slug variations
	function findInManifest(m: GroveTermManifest, s: string): GroveTermEntry | null {
		// Direct match
		if (s in m) return m[s];
		// Try with "your-" prefix (for grove, garden)
		if (`your-${s}` in m) return m[`your-${s}`];
		// Try plural/singular
		if (`${s}s` in m) return m[`${s}s`];
		if (s.endsWith('s') && s.slice(0, -1) in m) return m[s.slice(0, -1)];
		return null;
	}

	/**
	 * Get entry from manifest if available
	 */
	function getEntryFromManifest(): GroveTermEntry | null {
		if (manifest) {
			return findInManifest(manifest, slug);
		}
		return null;
	}

	/**
	 * Load entry data (from manifest or could be extended to fetch)
	 */
	async function loadEntry() {
		// Try manifest first (synchronous)
		const fromManifest = getEntryFromManifest();
		if (fromManifest) {
			entry = fromManifest;
			return;
		}

		// If no manifest provided and no entry found, show error
		// Future: could add API fetch here
		loading = false;
		error = `Term "${term}" not found`;
	}

	/**
	 * Handle click - open popup
	 */
	function handleClick(event: MouseEvent) {
		event.preventDefault();
		popupOpen = true;
		if (!entry && !loading) {
			loadEntry();
		}
	}

	/**
	 * Handle keyboard activation
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			popupOpen = true;
			if (!entry && !loading) {
				loadEntry();
			}
		}
	}

	/**
	 * Preload entry on hover (150ms delay)
	 */
	function handlePointerEnter() {
		if (entry || loading) return;

		preloadTimer = setTimeout(() => {
			loadEntry();
		}, 150);
	}

	function handlePointerLeave() {
		if (preloadTimer) {
			clearTimeout(preloadTimer);
			preloadTimer = null;
		}
	}

	function handleFocus() {
		if (!entry && !loading) {
			loadEntry();
		}
	}

	function handlePopupClose() {
		popupOpen = false;
	}

	// Get category for styling (from loaded entry or default)
	const category = $derived<GroveTermCategory>(entry?.category || 'foundational');

	// Display text: standard term when Grove Mode is OFF, Grove term when ON
	const displayText = $derived(
		showAsGrove
			? (entry?.term || term.charAt(0).toUpperCase() + term.slice(1))
			: (entry?.standardTerm || entry?.term || term.charAt(0).toUpperCase() + term.slice(1))
	);
</script>

<!--
  Mode-aware rendering:
  - Grove Mode ON (or alwaysGrove): interactive span with category underline
  - Grove Mode OFF + has standardTerm: subtle style, still clickable for learning
-->
<span
	class={cn(
		'grove-term',
		showAsGrove && `grove-term--${category}`,
		!showAsGrove && 'grove-term--standard',
		inline && 'grove-term--inline',
		className
	)}
	role="button"
	tabindex="0"
	aria-label={showAsGrove
		? `Grove term: ${entry?.term || term}, ${category} category`
		: `${entry?.standardTerm || term} (Grove term: ${entry?.term || term})`}
	aria-haspopup="dialog"
	onclick={handleClick}
	onkeydown={handleKeydown}
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
	onfocus={handleFocus}
>
	{#if children}
		{@render children()}
	{:else}
		{displayText}
	{/if}
</span>

<!-- Popup overlay -->
<GroveTermPopup
	bind:open={popupOpen}
	{entry}
	{manifest}
	{loading}
	{error}
	onclose={handlePopupClose}
/>

<style>
	.grove-term {
		/* Base styles */
		position: relative;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-thickness: 2px;
		transition: all 0.15s ease;

		/* Category color variables - light mode */
		--gt-foundational: #d97706;
		--gt-platform: #16a34a;
		--gt-content: #a855f7;
		--gt-tools: #f59e0b;
		--gt-operations: #6b7280;
	}

	/* Dark mode colors */
	:global(.dark) .grove-term {
		--gt-foundational: #fbbf24;
		--gt-platform: #22c55e;
		--gt-content: #c084fc;
		--gt-tools: #fcd34d;
		--gt-operations: #9ca3af;
	}

	/* Standard mode: visible but understated indicator */
	.grove-term--standard {
		text-decoration-color: rgba(107, 114, 128, 0.5);
		text-decoration-style: dotted;
		text-decoration-thickness: 1px;
	}

	:global(.dark) .grove-term--standard {
		text-decoration-color: rgba(156, 163, 175, 0.5);
	}

	.grove-term--standard:hover,
	.grove-term--standard:focus-visible {
		text-decoration-color: rgba(107, 114, 128, 0.8);
		text-decoration-style: solid;
		background-color: rgba(107, 114, 128, 0.08);
	}

	:global(.dark) .grove-term--standard:hover,
	:global(.dark) .grove-term--standard:focus-visible {
		text-decoration-color: rgba(156, 163, 175, 0.8);
		background-color: rgba(156, 163, 175, 0.08);
	}

	/* Category-specific underline colors */
	.grove-term--foundational {
		text-decoration-color: var(--gt-foundational);
	}

	.grove-term--platform {
		text-decoration-color: var(--gt-platform);
	}

	.grove-term--content {
		text-decoration-color: var(--gt-content);
	}

	.grove-term--tools {
		text-decoration-color: var(--gt-tools);
	}

	.grove-term--operations {
		text-decoration-color: var(--gt-operations);
	}

	/* Hover state - thicker underline and subtle background */
	.grove-term:hover,
	.grove-term:focus-visible {
		text-decoration-style: solid;
		text-decoration-thickness: 2px;
	}

	.grove-term--foundational:hover,
	.grove-term--foundational:focus-visible {
		background-color: rgba(217, 119, 6, 0.1);
	}

	.grove-term--platform:hover,
	.grove-term--platform:focus-visible {
		background-color: rgba(22, 163, 74, 0.1);
	}

	.grove-term--content:hover,
	.grove-term--content:focus-visible {
		background-color: rgba(168, 85, 247, 0.1);
	}

	.grove-term--tools:hover,
	.grove-term--tools:focus-visible {
		background-color: rgba(245, 158, 11, 0.1);
	}

	.grove-term--operations:hover,
	.grove-term--operations:focus-visible {
		background-color: rgba(107, 114, 128, 0.1);
	}

	/* Focus ring */
	.grove-term:focus-visible {
		outline: 2px solid var(--color-primary, #16a34a);
		outline-offset: 2px;
		border-radius: 2px;
	}

	/* Inline display */
	.grove-term--inline {
		display: inline;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.grove-term {
			transition: none;
		}
	}
</style>
