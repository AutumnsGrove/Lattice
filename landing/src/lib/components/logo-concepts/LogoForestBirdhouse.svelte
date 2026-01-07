<!--
  Grove Logo: The Birdhouse
  A tree with a handcrafted birdhouse mounted on it
  Evokes: "We've been expecting you"
-->
<script lang="ts">
	/**
	 * Grove Logo: The Birdhouse
	 * Stewardship, welcome, "someone prepared this place"
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Birdhouse color (defaults to warm wood) */
		houseColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		houseColor,
		title
	}: Props = $props();

	const house = $derived(houseColor ?? color);
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

	<!-- Tree trunk -->
	<path d="M10 28V8" stroke={color} stroke-width="3" stroke-linecap="round" />

	<!-- Tree canopy (simple rounded crown) -->
	<circle cx="10" cy="6" r="5" stroke={color} stroke-width="2" fill="none" />

	<!-- Branch for birdhouse -->
	<path d="M12 14h6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Birdhouse body -->
	<rect x="17" y="10" width="8" height="8" rx="1" stroke={house} stroke-width="1.5" fill="none" />

	<!-- Birdhouse roof -->
	<path
		d="M16 10l5-3l5 3"
		stroke={house}
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	<!-- Entry hole -->
	<circle cx="21" cy="14" r="1.5" stroke={house} stroke-width="1.5" fill="none" />

	<!-- Little perch -->
	<path d="M21 16v2" stroke={house} stroke-width="1.5" stroke-linecap="round" />

	<!-- Ground -->
	<path d="M2 28h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
