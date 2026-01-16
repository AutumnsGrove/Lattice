<!--
  Grove Logo: The Nest
  Trees with a bird's nest nestled in the branches
  Evokes: "Where fragile things are safe"
-->
<script lang="ts">
	/**
	 * Grove Logo: The Nest
	 * Safety, nurturing, new beginnings
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Nest color (defaults to warm brown) */
		nestColor?: string;
		/** Show eggs in nest */
		showEggs?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		nestColor,
		showEggs = true,
		title
	}: Props = $props();

	const nest = $derived(nestColor ?? color);
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
		d="M8 6L4 14h8L8 6z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M8 14v10" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right tree with branch extending left -->
	<path
		d="M24 4L20 12h8L24 4z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M24 12v12" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Branch extending toward center where nest sits -->
	<path d="M20 14h-4" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- The nest (woven cup shape) -->
	<ellipse cx="16" cy="16" rx="4" ry="2" stroke={nest} stroke-width="1.5" fill="none" />
	<path
		d="M12 16c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5"
		stroke={nest}
		stroke-width="1.5"
		stroke-linecap="round"
	/>

	<!-- Eggs -->
	{#if showEggs}
		<ellipse cx="14.5" cy="16.5" rx="1" ry="1.3" fill={color} opacity="0.6" />
		<ellipse cx="17" cy="16.8" rx="1" ry="1.3" fill={color} opacity="0.6" />
	{/if}

	<!-- Ground -->
	<path d="M2 26h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
