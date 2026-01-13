<!--
  Grove Logo Concept 8: The Grove Seal
  A rounded seal/badge shape with organic internal elements
  Evokes: A place, an identity, belonging
-->
<script lang="ts">
	/**
	 * Grove Logo: Grove Seal
	 * A rounded seal/badge shape with organic internal elements
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Stroke color (defaults to currentColor for easy theming) */
		color?: string;
		/** Accessible name for screen readers (renders SVG title element) */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		title
	}: Props = $props();
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
	<!-- Outer ring - the boundary of the grove -->
	<circle
		cx="16" cy="16" r="13"
		stroke={color}
		stroke-width="2"
	/>

	<!-- Inner organic elements - three converging paths/branches -->
	<path
		d="M16 6
		   Q16 10, 16 14"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>
	<path
		d="M8 22
		   Q12 18, 15 16"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>
	<path
		d="M24 22
		   Q20 18, 17 16"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>

	<!-- Center point where all paths meet -->
	<circle cx="16" cy="16" r="2.5" fill={color} />
</svg>
