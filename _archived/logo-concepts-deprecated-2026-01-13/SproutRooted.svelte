<!--
  Grove Logo: Sprout Rooted
  A sprout with visible roots—grounded, established, connected
  Evokes: Strong foundation, mycelium network, belonging
-->
<script lang="ts">
	/**
	 * Grove Logo: Sprout Rooted
	 * Growth above, connection below—grounded in community
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Foliage color */
		color?: string;
		/** Root color (defaults to color with reduced opacity) */
		rootColor?: string;
		/** Show ground line */
		showGround?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		rootColor,
		showGround = true,
		title
	}: Props = $props();

	const roots = $derived(rootColor ?? color);
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

	<!-- Roots (below ground) -->
	<g opacity="0.5">
		<!-- Central root -->
		<path
			d="M16 18v6c0 1-1 3-2 4"
			stroke={roots}
			stroke-width="1.5"
			stroke-linecap="round"
		/>
		<!-- Left root -->
		<path
			d="M16 20c-2 1-4 3-6 3"
			stroke={roots}
			stroke-width="1.5"
			stroke-linecap="round"
		/>
		<!-- Right root -->
		<path
			d="M16 20c2 1 5 2 7 4"
			stroke={roots}
			stroke-width="1.5"
			stroke-linecap="round"
		/>
		<!-- Small root tendrils -->
		<path
			d="M12 22c-1 1-2 2-3 2M20 23c1 1 2 1 3 2"
			stroke={roots}
			stroke-width="1"
			stroke-linecap="round"
		/>
	</g>

	{#if showGround}
		<!-- Ground line -->
		<path
			d="M4 18h24"
			stroke={color}
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-dasharray="2 2"
			opacity="0.4"
		/>
	{/if}

	<!-- Sprout above ground -->
	<g transform="translate(4, -2) scale(1)">
		<!-- Main stem -->
		<path
			d="M14 17c0-2 .5-2.5.5-4a3.5 3.5 0 0 1 3.5-3.5 3.5 3.5 0 0 0 3.5-3.5V4.5A3 3 0 0 1 24.5 2h1a.5.5 0 0 1 .5.5V4a3 3 0 0 1-3 3"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<!-- Left leaf -->
		<path
			d="M5 8a4 4 0 0 1 6.5 3 4 4 0 0 1-6.5-3"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>
</svg>
