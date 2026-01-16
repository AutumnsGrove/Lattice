<!--
  Grove Logo: The Lantern (Minimal)
  Simplified lantern that works at very small sizes
  Evokes: Warmth, a guiding light, welcome
-->
<script lang="ts">
	/**
	 * Grove Logo: Lantern Minimal
	 * Reduced to essence—glow and base, works at 16px
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Base/frame color (defaults to currentColor) */
		color?: string;
		/** Glow color (defaults to warm amber) */
		glowColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		glowColor,
		title
	}: Props = $props();

	const glow = $derived(glowColor ?? color);
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 32 32"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- The light/flame - filled circle -->
	<circle
		cx="16"
		cy="12"
		r="7"
		fill={glow}
	/>

	<!-- Simple base/stand -->
	<path
		d="M16 19v7"
		stroke={color}
		stroke-width="3"
		stroke-linecap="round"
	/>

	<!-- Small base foot -->
	<path
		d="M12 26h8"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>
</svg>
