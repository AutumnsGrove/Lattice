<!--
  Grove Logo: Forest Owl
  Trees with an owl perched, watching over the grove
  Evokes: Wisdom, guardianship, "the grove keeper"
-->
<script lang="ts">
	/**
	 * Grove Logo: Forest Owl
	 * Trees with a watchful owl—guardian of the grove
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Tree color (defaults to currentColor) */
		color?: string;
		/** Owl eye color (defaults to warm amber) */
		eyeColor?: string;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		eyeColor,
		title
	}: Props = $props();

	const eyes = $derived(eyeColor ?? '#fbbf24');
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
		d="M7 8L3 16h8L7 8z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M7 16v8" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Right tree -->
	<path
		d="M25 12L22 18h6L25 12z"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M25 18v6" stroke={color} stroke-width="2" stroke-linecap="round" />

	<!-- Owl body (center, perched) -->
	<ellipse cx="16" cy="14" rx="4" ry="5" stroke={color} stroke-width="2" />

	<!-- Owl ears/tufts -->
	<path d="M13 10l-1-2" stroke={color} stroke-width="1.5" stroke-linecap="round" />
	<path d="M19 10l1-2" stroke={color} stroke-width="1.5" stroke-linecap="round" />

	<!-- Owl eyes -->
	<circle cx="14.5" cy="13" r="1.5" fill={eyes} />
	<circle cx="17.5" cy="13" r="1.5" fill={eyes} />

	<!-- Owl pupils -->
	<circle cx="14.5" cy="13" r="0.5" fill={color} />
	<circle cx="17.5" cy="13" r="0.5" fill={color} />

	<!-- Owl beak -->
	<path d="M16 14.5l-0.5 1.5h1z" fill={color} />

	<!-- Branch the owl sits on -->
	<path d="M12 19h8" stroke={color} stroke-width="1.5" stroke-linecap="round" />

	<!-- Ground -->
	<path d="M2 26h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
</svg>
