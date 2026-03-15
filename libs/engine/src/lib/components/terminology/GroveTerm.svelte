<script lang="ts">
	import { cn } from '$lib/ui/utils';
	import GroveTermPopup from './GroveTermPopup.svelte';
	import type { GroveTermEntry, GroveTermManifest, GroveTermCategory } from './types';
	import type { Snippet } from 'svelte';
	import { groveModeStore } from '$lib/ui/stores';
	import { natureIcons } from '@autumnsgrove/prism/icons';

	// Import manifest internally so consumers don't need to
	import defaultManifestData from '$lib/data/grove-term-manifest.json';
	const defaultManifest = defaultManifestData as GroveTermManifest;

	// GroveTerm - Unified Grove terminology component
	//
	// Defaults to non-interactive (silent text swap based on Grove Mode).
	// Opt into interactive mode (popup + category underlines) with the `interactive` prop.
	//
	// Usage:
	//   <GroveTerm term="bloom" />                          <!-- silent swap -->
	//   <GroveTerm term="bloom">blooms</GroveTerm>          <!-- silent swap, custom text -->
	//   <GroveTerm term="bloom" standard="posts" />         <!-- explicit standard override -->
	//   <GroveTerm term="grove" interactive />               <!-- popup + underline -->
	//   <GroveTerm term="porch" icon />                      <!-- shows Leaf icon -->

	interface Props {
		/** Term slug to look up (e.g., "grove", "heartwood", "wanderer") */
		term: string;
		/** Enable popup + category-colored underline (default: false) */
		interactive?: boolean;
		/** Explicit standard term override (skips manifest lookup for standard term) */
		standard?: string;
		/** Show a Leaf icon next to the term */
		icon?: boolean;
		/** Display inline with text (default: true) */
		inline?: boolean;
		/** Optional link to the actual service/page this term represents */
		href?: string;
		/** Static manifest for build-time lookup (optional) */
		manifest?: GroveTermManifest;
		/** Additional CSS classes */
		class?: string;
		/** Override display text */
		children?: Snippet;
		/** Force display of grove or standard term regardless of mode */
		displayOverride?: 'grove' | 'standard';
	}

	let {
		term,
		interactive = false,
		standard,
		icon = false,
		inline = true,
		href,
		class: className,
		manifest = defaultManifest,
		children,
		displayOverride
	}: Props = $props();

	// State (only used in interactive mode, but declared unconditionally for Svelte reactivity)
	let popupOpen = $state(false);
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

	// Try common slug variations
	function findInManifest(m: GroveTermManifest, s: string): GroveTermEntry | null {
		if (s in m) return m[s];
		if (`your-${s}` in m) return m[`your-${s}`];
		if (`${s}s` in m) return m[`${s}s`];
		if (s.endsWith('s') && s.slice(0, -1) in m) return m[s.slice(0, -1)];
		return null;
	}

	// Eagerly resolve entry from manifest
	let entry = $state<GroveTermEntry | null>(null);
	$effect(() => {
		if (!entry && manifest) {
			const found = findInManifest(manifest, slug);
			if (found) entry = found;
		}
	});

	// Whether this term should show as Grove or standard
	const showAsGrove = $derived(
		displayOverride === 'grove' ? true :
		displayOverride === 'standard' ? false :
		groveModeStore.current || entry?.alwaysGrove || (!standard && !entry?.standardTerm)
	);

	// Display text: standard term when Grove Mode is OFF, Grove term when ON
	const displayText = $derived(
		showAsGrove
			? (entry?.term || term.charAt(0).toUpperCase() + term.slice(1))
			: (standard || entry?.standardTerm || entry?.term || term.charAt(0).toUpperCase() + term.slice(1))
	);

	// --- Interactive-only logic ---

	function getEntryFromManifest(): GroveTermEntry | null {
		if (manifest) return findInManifest(manifest, slug);
		return null;
	}

	async function loadEntry() {
		const fromManifest = getEntryFromManifest();
		if (fromManifest) {
			entry = fromManifest;
			return;
		}
		loading = false;
		error = `Term "${term}" not found`;
	}

	function handleClick(event: MouseEvent) {
		event.preventDefault();
		popupOpen = true;
		if (!entry && !loading) loadEntry();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			popupOpen = true;
			if (!entry && !loading) loadEntry();
		}
	}

	function handlePointerEnter() {
		if (entry || loading) return;
		preloadTimer = setTimeout(() => loadEntry(), 150);
	}

	function handlePointerLeave() {
		if (preloadTimer) {
			clearTimeout(preloadTimer);
			preloadTimer = null;
		}
	}

	function handleFocus() {
		if (!entry && !loading) loadEntry();
	}

	function handlePopupClose() {
		popupOpen = false;
	}

	const category = $derived<GroveTermCategory>(entry?.category || 'foundational');
</script>

{#if interactive}
	<!-- Interactive mode: clickable span with category underline + popup -->
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
		{#if showAsGrove}
			{#if children}{@render children()}{:else}{displayText}{/if}
		{:else}
			{displayText}
		{/if}
		{#if icon}<natureIcons.leaf class="grove-term-icon" aria-hidden="true" />{/if}
	</span>

	<GroveTermPopup
		bind:open={popupOpen}
		{entry}
		{manifest}
		{loading}
		{error}
		{href}
		onclose={handlePopupClose}
	/>
{:else}
	<!-- Non-interactive mode: plain text swap, zero chrome -->
	{#if showAsGrove}{#if children}{@render children()}{:else}{displayText}{/if}{:else}{displayText}{/if}{#if icon}<natureIcons.leaf class="grove-term-icon" aria-hidden="true" />{/if}
{/if}

<style>
	.grove-term {
		position: relative;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
		text-decoration-thickness: 2px;
		transition: all 0.15s ease;

		--gt-foundational: #d97706;
		--gt-platform: #16a34a;
		--gt-content: #a855f7;
		--gt-tools: #f59e0b;
		--gt-operations: #6b7280;
	}

	:global(.dark) .grove-term {
		--gt-foundational: #fbbf24;
		--gt-platform: #22c55e;
		--gt-content: #c084fc;
		--gt-tools: #fcd34d;
		--gt-operations: #9ca3af;
	}

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

	.grove-term--foundational { text-decoration-color: var(--gt-foundational); }
	.grove-term--platform { text-decoration-color: var(--gt-platform); }
	.grove-term--content { text-decoration-color: var(--gt-content); }
	.grove-term--tools { text-decoration-color: var(--gt-tools); }
	.grove-term--operations { text-decoration-color: var(--gt-operations); }

	.grove-term:hover,
	.grove-term:focus-visible {
		text-decoration-style: solid;
		text-decoration-thickness: 2px;
	}

	.grove-term--foundational:hover, .grove-term--foundational:focus-visible { background-color: rgba(217, 119, 6, 0.1); }
	.grove-term--platform:hover, .grove-term--platform:focus-visible { background-color: rgba(22, 163, 74, 0.1); }
	.grove-term--content:hover, .grove-term--content:focus-visible { background-color: rgba(168, 85, 247, 0.1); }
	.grove-term--tools:hover, .grove-term--tools:focus-visible { background-color: rgba(245, 158, 11, 0.1); }
	.grove-term--operations:hover, .grove-term--operations:focus-visible { background-color: rgba(107, 114, 128, 0.1); }

	.grove-term:focus-visible {
		outline: 2px solid var(--color-primary, #16a34a);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.grove-term--inline { display: inline; }

	/* Leaf icon styling */
	:global(.grove-term-icon) {
		display: inline;
		width: 0.875rem;
		height: 0.875rem;
		margin-left: 0.125rem;
		vertical-align: -0.125rem;
		opacity: 0.6;
	}

	@media (prefers-reduced-motion: reduce) {
		.grove-term { transition: none; }
	}
</style>
