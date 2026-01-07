<!--
  Grove Logo Concept 4: The Gathering
  Three stylized trees leaning inward, forming community
  Evokes: Trees coming together, shared shelter, gathering place
-->
<script lang="ts">
	/**
	 * Grove Logo: The Gathering
	 * Three stylized trees leaning inward, forming community
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Fill color for canopies (defaults to currentColor for easy theming) */
		color?: string;
		/** Optional separate color for trunk elements (defaults to color) */
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
	<!-- Three trees leaning toward center, each with organic canopy and trunk -->

	<!-- Left tree - leaning right -->
	<g transform="rotate(15 8 28)">
		<ellipse cx="8" cy="10" rx="5" ry="7" fill={color} />
		<rect x="6.5" y="15" width="3" height="13" rx="1" fill={trunk} opacity="0.8" />
	</g>

	<!-- Center tree - upright, slightly taller -->
	<g>
		<ellipse cx="16" cy="8" rx="5" ry="7" fill={color} />
		<rect x="14.5" y="13" width="3" height="15" rx="1" fill={trunk} opacity="0.8" />
	</g>

	<!-- Right tree - leaning left -->
	<g transform="rotate(-15 24 28)">
		<ellipse cx="24" cy="10" rx="5" ry="7" fill={color} />
		<rect x="22.5" y="15" width="3" height="13" rx="1" fill={trunk} opacity="0.8" />
	</g>
</svg>
