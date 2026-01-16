<!--
  Grove Logo: The Garden
  A full, expansive grove experience - everything together
  Evokes: "The complete vision. A world unto itself."
-->
<script lang="ts">
	/**
	 * Grove Logo: The Garden
	 * The full grove experience - trees, light, life, magic
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree/nature color (defaults to currentColor) */
		color?: string;
		/** Warm accent color for lantern/fire (defaults to amber) */
		warmColor?: string;
		/** Magic accent for fireflies/glow (defaults to soft yellow) */
		glowColor?: string;
		/** Time of day affects mood */
		timeOfDay?: 'day' | 'dusk' | 'night';
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		warmColor,
		glowColor,
		timeOfDay = 'dusk',
		title
	}: Props = $props();

	const warm = $derived(warmColor ?? '#f59e0b');
	const glow = $derived(glowColor ?? '#fde047');
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 48 48"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- Sky elements (night mode) -->
	{#if timeOfDay === 'night'}
		<circle cx="40" cy="6" r="3" stroke={color} stroke-width="1" fill="none" opacity="0.6" />
		<circle cx="8" cy="4" r="0.8" fill={color} opacity="0.5" />
		<circle cx="20" cy="3" r="0.6" fill={color} opacity="0.4" />
		<circle cx="35" cy="8" r="0.5" fill={color} opacity="0.3" />
	{/if}

	<!-- Background tree (far left, small) -->
	<path
		d="M6 18L3 24h6L6 18z"
		stroke={color}
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.5"
	/>
	<path d="M6 24v6" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.5" />

	<!-- Main left tree (pine) -->
	<path
		d="M14 8L9 18h10L14 8z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M14 14L8 26h12L14 14z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M14 26v12" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Center deciduous tree -->
	<ellipse cx="28" cy="14" rx="6" ry="7" stroke={color} stroke-width="2" fill="none" />
	<path d="M28 21v17" stroke={color} stroke-width="2.5" stroke-linecap="round" />

	<!-- Right tree (smaller pine) -->
	<path
		d="M40 14L36 22h8L40 14z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M40 22v8" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Birdhouse on center tree -->
	<rect x="31" y="18" width="5" height="4" rx="0.5" stroke={color} stroke-width="1" fill="none" />
	<path d="M30.5 18l2.5-1.5l2.5 1.5" stroke={color} stroke-width="1" stroke-linecap="round" />
	<circle cx="33.5" cy="19.5" r="0.8" stroke={color} stroke-width="0.8" fill="none" />

	<!-- Lantern (hanging or standing in clearing) -->
	<g transform="translate(22, 30)">
		<!-- Lantern glow -->
		<circle cx="0" cy="0" r="3" fill={warm} opacity="0.3" />
		<circle cx="0" cy="0" r="1.5" fill={warm} opacity="0.6" />
		<!-- Lantern body -->
		<rect x="-1.5" y="-2" width="3" height="4" rx="0.5" stroke={color} stroke-width="1" fill="none" />
		<path d="M-1.5 -2v-1.5h3v1.5" stroke={color} stroke-width="1" stroke-linecap="round" />
	</g>

	<!-- Fireflies scattered -->
	<circle cx="18" cy="22" r="1" fill={glow} opacity="0.8" />
	<circle cx="35" cy="18" r="0.8" fill={glow} opacity="0.6" />
	<circle cx="25" cy="26" r="0.6" fill={glow} opacity="0.7" />
	<circle cx="10" cy="28" r="0.7" fill={glow} opacity="0.5" />
	<circle cx="42" cy="26" r="0.5" fill={glow} opacity="0.4" />

	<!-- Stream at bottom -->
	<path
		d="M0 42c8-2 16 2 24 0s16 2 24 0"
		stroke={color}
		stroke-width="1.5"
		stroke-linecap="round"
		opacity="0.4"
	/>

	<!-- Stepping stones across stream -->
	<ellipse cx="12" cy="41" rx="2" ry="1" fill={color} opacity="0.3" />
	<ellipse cx="20" cy="42" rx="2" ry="1" fill={color} opacity="0.3" />
	<ellipse cx="28" cy="41" rx="2" ry="1" fill={color} opacity="0.3" />

	<!-- Ground/path area -->
	<path d="M0 44h48" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />

	<!-- Small mushrooms (fairy ring hint) -->
	<ellipse cx="32" cy="38" rx="1" ry="0.6" fill={color} opacity="0.4" />
	<ellipse cx="35" cy="39" rx="0.8" ry="0.5" fill={color} opacity="0.3" />

	<!-- Flowers/plants -->
	<path d="M8 38c0-1 1-1.5 1-2.5" stroke={color} stroke-width="1" stroke-linecap="round" opacity="0.5" />
	<circle cx="9" cy="35" r="1" fill={warm} opacity="0.4" />
</svg>
