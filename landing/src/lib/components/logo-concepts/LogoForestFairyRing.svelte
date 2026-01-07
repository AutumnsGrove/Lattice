<!--
  Grove Logo: The Fairy Ring
  Trees encircling a ring of glowing mushrooms
  Evokes: "Magic gathers here"
-->
<script lang="ts">
	/**
	 * Grove Logo: The Fairy Ring
	 * Magic, wonder, enchanted community
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Mushroom glow color (defaults to soft purple) */
		glowColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		glowColor,
		title
	}: Props = $props();

	const glow = $derived(glowColor ?? '#c084fc');
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
		d="M6 6L2 14h8L6 6z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M6 14v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right tree -->
	<path
		d="M26 6L22 14h8L26 6z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M26 14v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Fairy ring glow (background) -->
	<circle cx="16" cy="24" r="6" fill={glow} opacity="0.15" />

	<!-- Mushrooms in a ring -->
	<!-- Top mushroom -->
	<ellipse cx="16" cy="19" rx="1.5" ry="1" fill={glow} />
	<path d="M16 20v1.5" stroke={glow} stroke-width="1" stroke-linecap="round" />

	<!-- Left mushroom -->
	<ellipse cx="11" cy="23" rx="1.3" ry="0.8" fill={glow} />
	<path d="M11 23.8v1.2" stroke={glow} stroke-width="1" stroke-linecap="round" />

	<!-- Right mushroom -->
	<ellipse cx="21" cy="23" rx="1.3" ry="0.8" fill={glow} />
	<path d="M21 23.8v1.2" stroke={glow} stroke-width="1" stroke-linecap="round" />

	<!-- Bottom left mushroom -->
	<ellipse cx="13" cy="27" rx="1.2" ry="0.7" fill={glow} />
	<path d="M13 27.7v1" stroke={glow} stroke-width="1" stroke-linecap="round" />

	<!-- Bottom right mushroom -->
	<ellipse cx="19" cy="27" rx="1.2" ry="0.7" fill={glow} />
	<path d="M19 27.7v1" stroke={glow} stroke-width="1" stroke-linecap="round" />

	<!-- Small glow dots (spores/magic) -->
	<circle cx="14" cy="22" r="0.5" fill={glow} opacity="0.7" />
	<circle cx="18" cy="21" r="0.4" fill={glow} opacity="0.6" />
	<circle cx="16" cy="25" r="0.4" fill={glow} opacity="0.5" />
</svg>
