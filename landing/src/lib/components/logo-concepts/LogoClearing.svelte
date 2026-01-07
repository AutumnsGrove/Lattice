<!--
  Grove Logo: The Clearing
  An open circle with a gap—space made for you
  Evokes: Community with room, "we saved you a spot"
-->
<script lang="ts">
	/**
	 * Grove Logo: The Clearing
	 * A broken circle—there's room for you here
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Circle color (defaults to currentColor) */
		color?: string;
		/** Center dot color */
		centerColor?: string;
		/** Show center gathering point */
		showCenter?: boolean;
		/** Gap position: 'right' | 'bottom' | 'left' */
		gapPosition?: 'right' | 'bottom' | 'left';
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		centerColor,
		showCenter = true,
		gapPosition = 'right',
		title
	}: Props = $props();

	const center = $derived(centerColor ?? color);

	// Arc paths for different gap positions
	const arcPaths = {
		right: 'M26 16a10 10 0 1 1-6-9.2',  // Gap on right
		bottom: 'M16 26a10 10 0 1 1 9.2-6',  // Gap on bottom
		left: 'M6 16a10 10 0 1 1 6 9.2'      // Gap on left
	};
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

	<!-- The broken circle - community with an opening -->
	<path
		d={arcPaths[gapPosition]}
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
	/>

	{#if showCenter}
		<!-- The gathering point at center -->
		<circle
			cx="16"
			cy="16"
			r="3"
			fill={center}
		/>
	{/if}
</svg>
