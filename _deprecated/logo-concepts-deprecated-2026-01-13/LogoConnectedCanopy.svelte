<!--
  Grove Logo Concept 2: The Connected Canopy
  Three overlapping leaf/canopy shapes creating unity
  Evokes: Looking up through the trees, shelter, community
-->
<script lang="ts">
	/**
	 * Grove Logo: Connected Canopy
	 * Three overlapping leaf/canopy shapes creating unity
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Fill color for canopy (defaults to currentColor for easy theming) */
		color?: string;
		/** Optional separate color for trunk element (defaults to color) */
		trunkColor?: string;
		/** Accessible name for screen readers (renders SVG title element) */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		trunkColor,
		title
	}: Props = $props();

	const trunk = $derived(trunkColor ?? color);
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 32 32"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}
	<!-- Three overlapping organic canopy shapes -->
	<!-- Left canopy - teardrop/leaf shape -->
	<ellipse
		cx="11" cy="14"
		rx="6" ry="8"
		fill={color}
		opacity="0.9"
		transform="rotate(-20 11 14)"
	/>
	<!-- Right canopy -->
	<ellipse
		cx="21" cy="14"
		rx="6" ry="8"
		fill={color}
		opacity="0.9"
		transform="rotate(20 21 14)"
	/>
	<!-- Center canopy (overlaps both, creating depth) -->
	<ellipse
		cx="16" cy="12"
		rx="5" ry="7"
		fill={color}
	/>
	<!-- Small trunk suggestion at bottom -->
	<rect x="14" y="22" width="4" height="6" rx="1" fill={trunk} opacity="0.7" />
</svg>
