<!--
  Grove Logo: Sprout Ring
  A sprout enclosed in a soft circle—growth within community
  Evokes: Safe space, nurturing, belonging
-->
<script lang="ts">
	/**
	 * Grove Logo: Sprout Ring
	 * Growth within protection—a seedling in a safe space
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Main color for sprout (defaults to currentColor) */
		color?: string;
		/** Ring color (defaults to color with opacity) */
		ringColor?: string;
		/** Ring style: 'solid' | 'dashed' | 'dotted' */
		ringStyle?: 'solid' | 'dashed' | 'dotted';
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		ringColor,
		ringStyle = 'solid',
		title
	}: Props = $props();

	const ring = $derived(ringColor ?? color);
	const dashArray = $derived(
		ringStyle === 'dashed' ? '4 2' : ringStyle === 'dotted' ? '1 2' : 'none'
	);
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

	<!-- Outer ring -->
	<circle
		cx="16"
		cy="16"
		r="14"
		stroke={ring}
		stroke-width="1.5"
		stroke-dasharray={dashArray}
		opacity="0.6"
	/>

	<!-- Sprout centered and scaled -->
	<g transform="translate(4, 4) scale(1)">
		<!-- Main stem curving up with leaf -->
		<path
			d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<!-- Left leaf -->
		<path
			d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</g>
</svg>
