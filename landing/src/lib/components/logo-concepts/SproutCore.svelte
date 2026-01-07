<!--
  Grove Logo: Sprout Core
  The Lucide Sprout, refined for logo use with fill option
  Evokes: Growth, new beginnings, the Grove brand
-->
<script lang="ts">
	/**
	 * Grove Logo: Sprout Core
	 * The foundational Sprout mark—clean, simple, scalable
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Stroke/fill color (defaults to currentColor) */
		color?: string;
		/** Use filled style instead of stroke */
		filled?: boolean;
		/** Stroke width for outline style */
		strokeWidth?: number;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		filled = false,
		strokeWidth = 2,
		title
	}: Props = $props();
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill={filled ? color : 'none'}
	stroke={filled ? 'none' : color}
	stroke-width={filled ? 0 : strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}
	<!-- Main stem curving up with leaf -->
	<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3" />
	<!-- Left leaf -->
	<path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4" />
	<!-- Ground line -->
	<path d="M5 21h14" />
</svg>
