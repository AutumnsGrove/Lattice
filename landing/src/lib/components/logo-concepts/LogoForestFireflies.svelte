<!--
  Grove Logo: Forest with Fireflies
  Trees with floating lights among them
  Evokes: Magic, wonder, "the grove comes alive at night"
-->
<script lang="ts">
	/**
	 * Grove Logo: Forest with Fireflies
	 * Trees with gentle glowing lights scattered between
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Firefly glow color (defaults to warm yellow) */
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

	const glow = $derived(glowColor ?? '#fde047');
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
		d="M8 5L4 14h8L8 5z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M8 14v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right pine (smaller) -->
	<path
		d="M22 9L19 16h6L22 9z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M22 16v4" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Fireflies - scattered glowing dots -->
	<circle cx="15" cy="10" r="1.5" fill={glow} opacity="0.9" />
	<circle cx="12" cy="16" r="1" fill={glow} opacity="0.7" />
	<circle cx="18" cy="13" r="1.2" fill={glow} opacity="0.8" />
	<circle cx="14" cy="19" r="0.8" fill={glow} opacity="0.6" />
	<circle cx="26" cy="11" r="1" fill={glow} opacity="0.5" />

	<!-- Ground -->
	<path d="M2 24h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
