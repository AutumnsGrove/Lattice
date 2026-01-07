<!--
  Grove Logo: Sprout Double
  Two sprouts growing together—community, partnership
  Evokes: Connection, growing together, shared growth
-->
<script lang="ts">
	/**
	 * Grove Logo: Sprout Double
	 * Two sprouts intertwined—we grow together
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Primary sprout color */
		color?: string;
		/** Secondary sprout color (defaults to color) */
		secondaryColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		secondaryColor,
		title
	}: Props = $props();

	const secondary = $derived(secondaryColor ?? color);
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

	<!-- Left sprout (slightly behind) -->
	<g opacity="0.7">
		<!-- Stem -->
		<path
			d="M10 26c0-2 .5-3 .5-5a4 4 0 0 1 4-4 4 4 0 0 0 4-4V11.5"
			stroke={secondary}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<!-- Left leaf -->
		<path
			d="M6 13a4.5 4.5 0 0 1 7 3.5 4.5 4.5 0 0 1-7-3.5"
			stroke={secondary}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>

	<!-- Right sprout (foreground) -->
	<g>
		<!-- Stem -->
		<path
			d="M18 26c0-2 .5-3 .5-5a4 4 0 0 1 4-4 4 4 0 0 0 4-4V11a3.5 3.5 0 0 1 3.5-3.5h1a.5.5 0 0 1 .5.5v1a3.5 3.5 0 0 1-3.5 3.5"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<!-- Right leaf curling back -->
		<path
			d="M14 11a4.5 4.5 0 0 1 7 3.5 4.5 4.5 0 0 1-7-3.5"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>

	<!-- Shared ground -->
	<path
		d="M6 26h20"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
	/>
</svg>
