<!--
  Grove Logo: First Snow
  Evergreen trees with snow resting gently on their branches
  Evokes: "The grove shelters, always"
-->
<script lang="ts">
	/**
	 * Grove Logo: First Snow
	 * Peace, rest, shelter through all seasons
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Snow color (defaults to white/light) */
		snowColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		snowColor,
		title
	}: Props = $props();

	const snow = $derived(snowColor ?? '#ffffff');
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

	<!-- Left pine tree -->
	<path
		d="M9 8L5 14h8L9 8z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M9 12L4 20h10L9 12z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M9 20v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right pine tree (smaller, background) -->
	<path
		d="M23 12L20 17h6L23 12z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M23 15L19 22h8L23 15z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M23 22v4" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Snow on left tree branches -->
	<path d="M5 14h3" stroke={snow} stroke-width="2.5" stroke-linecap="round" />
	<path d="M9 14h4" stroke={snow} stroke-width="2.5" stroke-linecap="round" />
	<path d="M4 20h4" stroke={snow} stroke-width="2.5" stroke-linecap="round" />
	<path d="M10 20h4" stroke={snow} stroke-width="2.5" stroke-linecap="round" />

	<!-- Snow on right tree -->
	<path d="M20 17h2.5" stroke={snow} stroke-width="2" stroke-linecap="round" />
	<path d="M23.5 17h2.5" stroke={snow} stroke-width="2" stroke-linecap="round" />
	<path d="M19 22h3" stroke={snow} stroke-width="2" stroke-linecap="round" />
	<path d="M24 22h3" stroke={snow} stroke-width="2" stroke-linecap="round" />

	<!-- Snowflakes falling -->
	<circle cx="16" cy="6" r="1" fill={snow} opacity="0.7" />
	<circle cx="28" cy="10" r="0.8" fill={snow} opacity="0.5" />
	<circle cx="3" cy="8" r="0.6" fill={snow} opacity="0.6" />

	<!-- Snow on ground -->
	<path d="M2 28h28" stroke={snow} stroke-width="2" stroke-linecap="round" opacity="0.8" />
</svg>
