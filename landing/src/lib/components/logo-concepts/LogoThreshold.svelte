<!--
  Grove Logo: The Threshold
  A doorway into the grove—an invitation to enter
  Evokes: Welcome, shelter, "there's room for you"
-->
<script lang="ts">
	/**
	 * Grove Logo: The Threshold
	 * An archway—the doorway into the grove
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Arch color (defaults to currentColor) */
		color?: string;
		/** Center element color (the light/sprout inside) */
		centerColor?: string;
		/** Show center element (dot/light) */
		showCenter?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		centerColor,
		showCenter = true,
		title
	}: Props = $props();

	const center = $derived(centerColor ?? color);
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

	<!-- The archway - two organic curves meeting at top -->
	<path
		d="M6 28C6 28 6 14 6 10C6 4 10 2 16 2C22 2 26 4 26 10C26 14 26 28 26 28"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	<!-- Ground line (threshold) -->
	<path
		d="M6 28h20"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		opacity="0.5"
	/>

	{#if showCenter}
		<!-- The light/welcome inside - what you find when you enter -->
		<circle
			cx="16"
			cy="16"
			r="3"
			fill={center}
		/>
	{/if}
</svg>
