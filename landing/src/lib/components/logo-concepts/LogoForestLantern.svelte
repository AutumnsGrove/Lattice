<!--
  Grove Logo: Forest Lantern
  A grove of trees with a lantern glowing at the center
  Evokes: "Someone left a light on for you in the forest"
-->
<script lang="ts">
	/**
	 * Grove Logo: Forest Lantern
	 * Multiple trees creating a grove with a warm lantern at center
	 */
	import { TreePine, TreeDeciduous, Shrub } from 'lucide-svelte';
	import { IconTree } from '@tabler/icons-svelte';

	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Lantern glow color (defaults to warm amber) */
		glowColor?: string;
		/** Show the lantern at center */
		showLantern?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		glowColor,
		showLantern = true,
		title
	}: Props = $props();

	const glow = $derived(glowColor ?? '#f59e0b');
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 48 48"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- Left pine tree (smaller, background) -->
	<g transform="translate(4, 8) scale(0.7)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<!-- Pine shape -->
		<path d="M12 6L6 14h4l-3 6h3l-4 8h16l-4-8h3l-3-6h4L12 6z" />
		<path d="M12 28v4" />
	</g>

	<!-- Right deciduous tree (smaller, background) -->
	<g transform="translate(28, 6) scale(0.65)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<!-- Deciduous canopy -->
		<path d="M12 3a4 4 0 0 0-4 4c0 1 .5 1.5 1 2-1.5.5-3 2-3 4 0 2.5 2.5 4.5 5 4.5h2c2.5 0 5-2 5-4.5 0-2-1.5-3.5-3-4 .5-.5 1-1 1-2a4 4 0 0 0-4-4z" />
		<path d="M12 17.5v6.5" />
	</g>

	<!-- Center area with lantern glow -->
	{#if showLantern}
		<!-- Soft glow behind lantern -->
		<circle cx="24" cy="28" r="6" fill={glow} opacity="0.3" />
		<circle cx="24" cy="28" r="4" fill={glow} opacity="0.5" />

		<!-- Lantern body (minimal) -->
		<circle cx="24" cy="28" r="2.5" fill={glow} />

		<!-- Small lantern base -->
		<path d="M24 31v3" stroke={color} stroke-width="1.5" stroke-linecap="round" />
	{/if}

	<!-- Foreground shrub left -->
	<g transform="translate(8, 32) scale(0.5)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M6 14c0-5 4-9 6-9 2 0 6 4 6 9" />
		<path d="M12 14v4" />
	</g>

	<!-- Foreground shrub right -->
	<g transform="translate(28, 34) scale(0.45)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d="M6 14c0-5 4-9 6-9 2 0 6 4 6 9" />
		<path d="M12 14v4" />
	</g>

	<!-- Ground line to unify -->
	<path d="M6 42h36" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
