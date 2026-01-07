<!--
  Grove Logo: The Grove
  Three trees of varying heights creating a grove silhouette
  Evokes: Community, variety, belonging together
-->
<script lang="ts">
	/**
	 * Grove Logo: The Grove
	 * Three distinct trees standing together—a community
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Trunk color (defaults to color) */
		trunkColor?: string;
		/** Show ground line */
		showGround?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		trunkColor,
		showGround = true,
		title
	}: Props = $props();

	const trunk = $derived(trunkColor ?? color);
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

	<!-- Left tree: Pine (tallest) -->
	<g stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<!-- Pine triangular form - three tiers -->
		<path d="M8 4l-4 6h2.5l-3 5h2.5l-3 6h10l-3-6h2.5l-3-5h2.5L8 4z" />
		<!-- Trunk -->
		<path d="M8 21v5" stroke={trunk} />
	</g>

	<!-- Center tree: Deciduous (medium, rounded canopy) -->
	<g stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<!-- Rounded canopy -->
		<ellipse cx="16" cy="12" rx="4.5" ry="5" />
		<!-- Trunk -->
		<path d="M16 17v9" stroke={trunk} />
	</g>

	<!-- Right tree: Simple/young tree (smallest) -->
	<g stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<!-- Small rounded form -->
		<ellipse cx="24" cy="16" rx="3.5" ry="4" />
		<!-- Trunk -->
		<path d="M24 20v6" stroke={trunk} />
	</g>

	<!-- Ground -->
	{#if showGround}
		<path d="M2 28h28" stroke={trunk} stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
	{/if}
</svg>
