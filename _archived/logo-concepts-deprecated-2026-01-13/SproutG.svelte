<!--
  Grove Logo: Sprout G
  A stylized G formed by organic sprout curves
  Evokes: Grove brand identity, growth, the letter G
-->
<script lang="ts">
	/**
	 * Grove Logo: Sprout G
	 * The letter G, grown not drawn—organic brand mark
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Color (defaults to currentColor) */
		color?: string;
		/** Show leaf accent */
		showLeaf?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		showLeaf = true,
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

	<!-- G shape made from organic curves -->
	<path
		d="M26 12c-1-5-5-8-10-8C9 4 4 10 4 16s5 12 12 12c4 0 7-2 9-5"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	<!-- The horizontal bar of the G, with sprout-like curve -->
	<path
		d="M16 16h10c0 0 0 4-3 6"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>

	{#if showLeaf}
		<!-- Small leaf accent sprouting from top -->
		<path
			d="M20 6c2-2 5-2 6 0s-1 4-3 4c-1 0-2-1-3-2"
			stroke={color}
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		/>
	{/if}
</svg>
