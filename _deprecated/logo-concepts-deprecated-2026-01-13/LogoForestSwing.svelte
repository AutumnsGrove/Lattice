<!--
  Grove Logo: The Swing
  A sturdy tree with a wooden swing hanging from its branch
  Evokes: "Come sit. Stay a while."
-->
<script lang="ts">
	/**
	 * Grove Logo: The Swing
	 * Play, rest, nostalgia, invitation
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Swing seat color (defaults to warm wood tone) */
		seatColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		seatColor,
		title
	}: Props = $props();

	const seat = $derived(seatColor ?? color);
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

	<!-- Strong oak tree with spreading branch -->
	<!-- Trunk -->
	<path d="M10 28V12" stroke={color} stroke-width="3" stroke-linecap="round" />

	<!-- Canopy (rounded) -->
	<circle cx="10" cy="8" r="6" stroke={color} stroke-width="2" fill="none" />

	<!-- Branch extending right -->
	<path d="M14 10h10" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Swing ropes -->
	<path d="M20 10v12" stroke={color} stroke-width="1.5" stroke-linecap="round" />
	<path d="M26 10v12" stroke={color} stroke-width="1.5" stroke-linecap="round" />

	<!-- Swing seat -->
	<rect x="18" y="22" width="10" height="2" rx="0.5" fill={seat} />

	<!-- Ground -->
	<path d="M2 28h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
