<script lang="ts">
	/**
	 * Waystone - Re-exported from waystone module for backwards compatibility
	 *
	 * The Waystone component has been moved to ./waystone/Waystone.svelte
	 * with added popup functionality. This file re-exports it to maintain
	 * backwards compatibility with existing imports.
	 *
	 * New features:
	 * - Click opens a glassmorphism popup with article excerpt
	 * - Hover preloading for instant content
	 * - Falls back to link for no-JS
	 * - Same accessible design (44×44px touch target, screen reader labels)
	 */
	import { Waystone } from './waystone';
	import type { WaystoneManifest } from './waystone/types';

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
</script>

<Waystone {slug} {label} {size} {inline} class={className} {manifest} />
