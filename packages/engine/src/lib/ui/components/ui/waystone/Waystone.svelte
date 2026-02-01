<script lang="ts">
	import { HelpCircle } from 'lucide-svelte';
	import { cn } from '$lib/ui/utils';
	import WaystonePopup from './WaystonePopup.svelte';
	import type { WaystoneExcerpt, WaystoneManifest } from './types';

	// Waystone - In-context help trigger with popup overlay
	//
	// A small help icon that opens a glassmorphism popup with KB article
	// excerpts instead of navigating away. Falls back to a link for no-JS.
	//
	// Usage:
	//   <Waystone slug="custom-fonts" label="About custom fonts" />
	//   <p>Configure your theme <Waystone slug="choosing-a-theme" inline /></p>
	//
	// With static manifest (optional):
	//   import waystoneManifest from '$lib/data/waystone-manifest.json';
	//   <Waystone slug="custom-fonts" manifest={waystoneManifest} />

	interface Props {
		/** KB article slug (e.g., "custom-fonts") */
		slug: string;
		/** Screen reader label (default: "Learn more") */
		label?: string;
		/** Size variant */
		size?: 'sm' | 'md';
		/** Display inline with text */
		inline?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** Static manifest for build-time excerpt lookup (optional) */
		manifest?: WaystoneManifest;
	}

	let {
		slug,
		label = 'Learn more',
		size = 'sm',
		inline = false,
		class: className,
		manifest
	}: Props = $props();

	// State
	let popupOpen = $state(false);
	let excerpt = $state<WaystoneExcerpt | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let preloadTimer: ReturnType<typeof setTimeout> | null = null;

	// Full article URL - KB only exists on grove.place
	const fullArticleUrl = $derived(`https://grove.place/knowledge/help/${slug}`);

	/**
	 * Try to get excerpt from manifest (if available)
	 */
	function getExcerptFromManifest(): WaystoneExcerpt | null {
		if (manifest && slug in manifest) {
			return manifest[slug];
		}
		return null;
	}

	// API base URL - excerpts are served from grove.place (landing site)
	// This is absolute because Waystones may render on tenant subdomains
	const EXCERPT_API_BASE = 'https://grove.place/api/kb/excerpt';

	/**
	 * Fetch excerpt from API
	 */
	async function fetchExcerpt(): Promise<WaystoneExcerpt | null> {
		try {
			const response = await fetch(`${EXCERPT_API_BASE}/${slug}`);
			if (!response.ok) {
				throw new Error('Article not found');
			}
			return await response.json();
		} catch (e) {
			console.warn(`Failed to fetch Waystone excerpt for "${slug}":`, e);
			return null;
		}
	}

	/**
	 * Load excerpt data (from manifest or API)
	 */
	async function loadExcerpt() {
		// Try manifest first (synchronous)
		const fromManifest = getExcerptFromManifest();
		if (fromManifest) {
			excerpt = fromManifest;
			return;
		}

		// Fall back to API fetch
		loading = true;
		error = null;

		try {
			const fetched = await fetchExcerpt();
			if (fetched) {
				excerpt = fetched;
			} else {
				error = 'Unable to load help content';
			}
		} catch (e) {
			error = 'Unable to load help content';
		} finally {
			loading = false;
		}
	}

	/**
	 * Handle click - open popup
	 */
	function handleClick(event: MouseEvent) {
		event.preventDefault();
		popupOpen = true;
		if (!excerpt && !loading) {
			loadExcerpt();
		}
	}

	/**
	 * Handle keyboard activation
	 */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			popupOpen = true;
			if (!excerpt && !loading) {
				loadExcerpt();
			}
		}
	}

	/**
	 * Preload excerpt on hover (desktop) or focus (keyboard)
	 */
	function handlePointerEnter() {
		if (excerpt || loading) return;

		// Delay to avoid preloading on quick mouseovers
		preloadTimer = setTimeout(() => {
			loadExcerpt();
		}, 150);
	}

	function handlePointerLeave() {
		if (preloadTimer) {
			clearTimeout(preloadTimer);
			preloadTimer = null;
		}
	}

	function handleFocus() {
		if (!excerpt && !loading) {
			loadExcerpt();
		}
	}

	function handlePopupClose() {
		popupOpen = false;
	}
</script>

<!--
  Progressive enhancement: renders as a link for no-JS,
  becomes a button with popup when JS is available.
  The onclick handler prevents default navigation.
-->
<a
	href={fullArticleUrl}
	target="_blank"
	rel="noopener noreferrer"
	class={cn('waystone', `waystone--${size}`, inline && 'waystone--inline', className)}
	title="Help: {label}"
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={handleKeydown}
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
	onfocus={handleFocus}
>
	<span class="sr-only">Help: {label}</span>
	<HelpCircle class="waystone-icon" />
</a>

<!-- Popup overlay -->
<WaystonePopup
	bind:open={popupOpen}
	{excerpt}
	{fullArticleUrl}
	{loading}
	{error}
	onclose={handlePopupClose}
/>

<style>
	.waystone {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--glass-bg, var(--color-surface));
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
		text-decoration: none;
		transition: all 0.15s ease;
		flex-shrink: 0;
		position: relative;
		cursor: pointer;
	}

	/* Extend touch target to meet WCAG 2.5.5 (44×44px minimum) */
	.waystone::before {
		content: '';
		position: absolute;
		inset: -12px; /* Extends hit area beyond visual element */
		border-radius: 50%;
	}

	.waystone--sm {
		width: 20px;
		height: 20px;
	}

	.waystone--md {
		width: 24px;
		height: 24px;
	}

	.waystone--inline {
		margin-left: 0.5rem;
		vertical-align: middle;
	}

	.waystone:hover,
	.waystone:focus-visible {
		background: var(--color-accent, var(--color-primary));
		border-color: var(--color-accent, var(--color-primary));
		color: white;
	}

	.waystone:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	:global(.waystone-icon) {
		width: 14px;
		height: 14px;
	}

	.waystone--md :global(.waystone-icon) {
		width: 16px;
		height: 16px;
	}

	@media (prefers-reduced-motion: reduce) {
		.waystone {
			transition: none;
		}
	}
</style>
