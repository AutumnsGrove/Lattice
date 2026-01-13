<!--
  Grove Logo: Night Forest
  Trees with moon and stars above
  Evokes: Peace, quiet moments, "the grove at rest"
-->
<script lang="ts">
	/**
	 * Grove Logo: Night Forest
	 * Trees under a crescent moon with stars
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Moon/star color (defaults to soft white) */
		celestialColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		celestialColor,
		title
	}: Props = $props();

	const celestial = $derived(celestialColor ?? color);
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

	<!-- Crescent moon -->
	<path
		d="M24 4c-2 0-3.5 1.5-3.5 3.5s1.5 3.5 3.5 3.5c-2.5 0-4.5-2-4.5-4.5S21.5 2 24 2"
		stroke={celestial}
		stroke-width="1.5"
		stroke-linecap="round"
		fill="none"
	/>

	<!-- Stars -->
	<circle cx="6" cy="5" r="1" fill={celestial} />
	<circle cx="14" cy="3" r="0.8" fill={celestial} opacity="0.7" />
	<circle cx="10" cy="8" r="0.6" fill={celestial} opacity="0.5" />

	<!-- Left tree -->
	<path
		d="M9 12L5 20h8L9 12z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M9 20v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right tree (smaller, background) -->
	<path
		d="M21 15L18 22h6L21 15z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M21 22v4" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Ground -->
	<path d="M2 28h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
