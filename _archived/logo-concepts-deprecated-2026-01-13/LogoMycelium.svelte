<!--
  Grove Logo Concept 5: The Mycelium Mark
  Interconnected nodes representing the underground network
  Evokes: Hidden connections, community roots, shared foundation
-->
<script lang="ts">
	/**
	 * Grove Logo: Mycelium Mark
	 * Interconnected nodes representing the underground network
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Fill/stroke color (defaults to currentColor for easy theming) */
		color?: string;
		/** Accessible name for screen readers (renders SVG title element) */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
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
	<!-- Connection lines (draw first, behind nodes) -->
	<g stroke={color} stroke-width="1.5" stroke-linecap="round">
		<!-- Central hub connections -->
		<path d="M16 16 L9 10" />
		<path d="M16 16 L23 10" />
		<path d="M16 16 L8 20" />
		<path d="M16 16 L24 20" />
		<path d="M16 16 L16 26" />
		<!-- Outer connections -->
		<path d="M9 10 L5 6" />
		<path d="M9 10 L6 14" />
		<path d="M23 10 L27 6" />
		<path d="M23 10 L26 14" />
		<path d="M8 20 L4 22" />
		<path d="M24 20 L28 22" />
		<path d="M16 26 L12 29" />
		<path d="M16 26 L20 29" />
	</g>

	<!-- Nodes (main connection points) -->
	<!-- Central node - largest, the heart -->
	<circle cx="16" cy="16" r="3" fill={color} />

	<!-- Primary ring of nodes -->
	<circle cx="9" cy="10" r="2.5" fill={color} />
	<circle cx="23" cy="10" r="2.5" fill={color} />
	<circle cx="8" cy="20" r="2" fill={color} />
	<circle cx="24" cy="20" r="2" fill={color} />
	<circle cx="16" cy="26" r="2" fill={color} />

	<!-- Outer nodes - smaller, like distant trees -->
	<circle cx="5" cy="6" r="1.5" fill={color} opacity="0.8" />
	<circle cx="6" cy="14" r="1.5" fill={color} opacity="0.8" />
	<circle cx="27" cy="6" r="1.5" fill={color} opacity="0.8" />
	<circle cx="26" cy="14" r="1.5" fill={color} opacity="0.8" />
	<circle cx="4" cy="22" r="1.5" fill={color} opacity="0.8" />
	<circle cx="28" cy="22" r="1.5" fill={color} opacity="0.8" />
	<circle cx="12" cy="29" r="1.5" fill={color} opacity="0.8" />
	<circle cx="20" cy="29" r="1.5" fill={color} opacity="0.8" />
</svg>
