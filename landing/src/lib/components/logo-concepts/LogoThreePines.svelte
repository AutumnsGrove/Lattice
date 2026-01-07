<!--
  Grove Logo: Three Pines
  Three stylized pine trees at different heights
  Evokes: Forest depth, community, simplicity
  Works at 16px favicon size
-->
<script lang="ts">
	/**
	 * Grove Logo: Three Pines
	 * Minimal pine trio—works at any size
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Accessible name for screen readers */
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

	<!-- Three pines as simple triangles with trunks -->
	<!-- Left pine (tall) -->
	<path
		d="M8 4L3 18h10L8 4z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M8 18v8" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Center pine (medium, slightly forward) -->
	<path
		d="M17 8L13 20h8L17 8z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M17 20v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right pine (small, background feel) -->
	<path
		d="M25 12L22 22h6L25 12z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M25 22v4" stroke={color} stroke-width="2" stroke-linecap="round" />
</svg>
