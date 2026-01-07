<!--
  Grove Logo: The Lantern
  Light someone left for you in the forest
  Evokes: Warmth, welcome, someone expected you here
-->
<script lang="ts">
	/**
	 * Grove Logo: The Lantern
	 * A light in the clearing—warmth, guidance, welcome
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Frame/base color (defaults to currentColor) */
		color?: string;
		/** Glow color (defaults to a warm amber, can be seasonal) */
		glowColor?: string;
		/** Show the glow effect */
		showGlow?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		glowColor = '#fbbf24',
		showGlow = true,
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

	<!-- Glow effect (behind everything) -->
	{#if showGlow}
		<defs>
			<radialGradient id="lanternGlow" cx="50%" cy="40%" r="50%">
				<stop offset="0%" stop-color={glowColor} stop-opacity="0.6" />
				<stop offset="100%" stop-color={glowColor} stop-opacity="0" />
			</radialGradient>
		</defs>
		<circle cx="16" cy="13" r="10" fill="url(#lanternGlow)" />
	{/if}

	<!-- Lantern top hook -->
	<path
		d="M16 2v3M13 5h6"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
	/>

	<!-- Lantern frame - glass chamber -->
	<path
		d="M10 8c0-1 1-2 2-2h8c1 0 2 1 2 2v10c0 1-1 2-2 2h-8c-1 0-2-1-2-2V8z"
		stroke={color}
		stroke-width="2"
		fill="none"
	/>

	<!-- The flame/light inside -->
	<ellipse
		cx="16"
		cy="13"
		rx="3"
		ry="4"
		fill={glowColor}
	/>

	<!-- Lantern base -->
	<path
		d="M11 20h10M13 20v4c0 1 1 2 3 2s3-1 3-2v-4"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
