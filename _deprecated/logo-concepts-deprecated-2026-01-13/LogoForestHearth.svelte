<!--
  Grove Logo: Forest Hearth
  Trees gathered around a warm fire
  Evokes: Community, warmth, "gather 'round"
-->
<script lang="ts">
	/**
	 * Grove Logo: Forest Hearth
	 * Trees with a campfire at center—gathering place
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Fire glow color (defaults to warm orange) */
		fireColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		fireColor,
		title
	}: Props = $props();

	const fire = $derived(fireColor ?? '#f97316');
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
		d="M7 6L3 14h8L7 6z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M7 14v8" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right tree -->
	<path
		d="M25 6L21 14h8L25 6z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M25 14v8" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Campfire at center -->
	<!-- Fire glow -->
	<circle cx="16" cy="20" r="4" fill={fire} opacity="0.3" />

	<!-- Fire flames (simple) -->
	<path
		d="M16 24c-2 0-3-1.5-3-3.5 0-1.5 1-3 2-4 .5 1 1.5 1.5 1 3 1-1 2-2.5 2-4 1 1 2 2.5 2 4 0 2-1 4.5-4 4.5z"
		fill={fire}
	/>

	<!-- Fire logs -->
	<path d="M13 26l6-2" stroke={color} stroke-width="1.5" stroke-linecap="round" />
	<path d="M13 24l6 2" stroke={color} stroke-width="1.5" stroke-linecap="round" />

	<!-- Ground -->
	<path d="M2 28h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
