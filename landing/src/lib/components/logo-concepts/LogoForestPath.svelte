<!--
  Grove Logo: Forest Path
  Trees with a winding path leading in
  Evokes: Journey, invitation, "follow the path to the grove"
-->
<script lang="ts">
	/**
	 * Grove Logo: Forest Path
	 * Trees with a path leading into the grove
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Path color (defaults to softer version of color) */
		pathColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		pathColor,
		title
	}: Props = $props();

	const path = $derived(pathColor ?? color);
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

	<!-- Left tree -->
	<path
		d="M8 4L4 12h8L8 4z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M8 12v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right tree -->
	<path
		d="M24 4L20 12h8L24 4z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M24 12v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Winding path leading into the grove -->
	<path
		d="M16 30c0-4-3-6-3-10s3-6 3-10"
		stroke={path}
		stroke-width="2"
		stroke-linecap="round"
		stroke-dasharray="3 2"
		opacity="0.6"
	/>

	<!-- Path markers/stones -->
	<circle cx="13" cy="26" r="1" fill={path} opacity="0.5" />
	<circle cx="19" cy="22" r="1" fill={path} opacity="0.4" />
	<circle cx="13" cy="18" r="0.8" fill={path} opacity="0.3" />
</svg>
