<!--
  Grove Logo: The Garden (Minimal)
  Simplified garden that works at small sizes
  Evokes: "The essence of the grove"
-->
<script lang="ts">
	/**
	 * Grove Logo: The Garden (Minimal)
	 * Essential elements: tree, light, magic
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Warm glow color (defaults to amber) */
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

	const glow = $derived(glowColor ?? '#f59e0b');
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

	<!-- Left pine -->
	<path
		d="M10 6L6 14h8L10 6z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M10 14v8" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right deciduous -->
	<ellipse cx="22" cy="10" rx="4" ry="5" stroke={color} stroke-width="2" fill="none" />
	<path d="M22 15v7" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Central lantern glow -->
	<circle cx="16" cy="18" r="3" fill={glow} opacity="0.3" />
	<circle cx="16" cy="18" r="1.5" fill={glow} opacity="0.7" />

	<!-- Firefly dots -->
	<circle cx="12" cy="12" r="0.8" fill={glow} opacity="0.6" />
	<circle cx="20" cy="16" r="0.6" fill={glow} opacity="0.5" />
	<circle cx="26" cy="12" r="0.5" fill={glow} opacity="0.4" />

	<!-- Ground -->
	<path d="M4 26h24" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
