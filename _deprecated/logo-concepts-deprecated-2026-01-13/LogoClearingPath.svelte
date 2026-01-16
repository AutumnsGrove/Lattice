<!--
  Grove Logo Concept 6: The Clearing Path
  A stylized opening/clearing shape - like a doorway into the grove
  Evokes: Entering a welcoming space, an open invitation
-->
<script lang="ts">
	/**
	 * Grove Logo: Clearing Path
	 * A stylized opening/clearing shape—like a doorway into the grove
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Stroke color (defaults to currentColor for easy theming) */
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
	<!-- An arch/doorway shape made of organic, branch-like forms -->
	<!-- Left side of the arch -->
	<path
		d="M8 28
		   C6 28, 5 26, 5 22
		   C5 16, 7 10, 11 6
		   C13 4, 15 4, 16 5"
		stroke={color}
		stroke-width="3"
		stroke-linecap="round"
	/>
	<!-- Right side of the arch -->
	<path
		d="M24 28
		   C26 28, 27 26, 27 22
		   C27 16, 25 10, 21 6
		   C19 4, 17 4, 16 5"
		stroke={color}
		stroke-width="3"
		stroke-linecap="round"
	/>
	<!-- Small keystone/heart at the top where branches meet -->
	<circle cx="16" cy="5" r="2" fill={color} />
</svg>
