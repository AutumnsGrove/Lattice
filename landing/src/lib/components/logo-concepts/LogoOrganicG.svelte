<!--
  Grove Logo Concept 3: The Organic G
  A letter G that feels grown, not drawn - like a living branch
  Evokes: Growth, natural form, the "G" in Grove
-->
<script lang="ts">
	/**
	 * Grove Logo: Organic G
	 * A letter G that feels grown, not drawn—like a living branch
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Fill color (defaults to currentColor for easy theming) */
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
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}
	<!-- Organic G shape with natural branch-like thickness -->
	<path
		d="M24 10
		   C20 5, 10 5, 7 12
		   C4 19, 8 27, 16 27
		   C22 27, 26 23, 26 18
		   L19 18
		   C19 18, 19 22, 16 22
		   C12 22, 10 18, 11 14
		   C12 10, 16 9, 19 10
		   L24 10"
		fill={color}
	/>
	<!-- Small leaf accent at the top of the G -->
	<ellipse
		cx="24" cy="8"
		rx="3" ry="2"
		fill={color}
		transform="rotate(-30 24 8)"
	/>
</svg>
