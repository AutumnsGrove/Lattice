<!--
  Grove Logo: Sprout Heart
  A sprout with heart-shaped leaves—growth with love
  Evokes: Care, nurturing, growing with intention
-->
<script lang="ts">
	/**
	 * Grove Logo: Sprout Heart
	 * Growing with love—care made visible
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Color (defaults to currentColor) */
		color?: string;
		/** Use filled hearts */
		filled?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		filled = false,
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

	<!-- Stem -->
	<path
		d="M16 28V14"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
	/>

	<!-- Heart-shaped leaf cluster at top -->
	<path
		d="M16 14c0-3 2-6 5-6s5 3 5 6c0 4-5 7-5 7"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		fill={filled ? color : 'none'}
	/>
	<path
		d="M16 14c0-3-2-6-5-6s-5 3-5 6c0 4 5 7 5 7"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		fill={filled ? color : 'none'}
	/>

	<!-- Small leaves on stem -->
	<path
		d="M16 22c-2-1-4-1-4 1s2 2 4 1"
		stroke={color}
		stroke-width="1.5"
		stroke-linecap="round"
		fill={filled ? color : 'none'}
	/>
	<path
		d="M16 22c2-1 4-1 4 1s-2 2-4 1"
		stroke={color}
		stroke-width="1.5"
		stroke-linecap="round"
		fill={filled ? color : 'none'}
	/>

	<!-- Ground -->
	<path
		d="M10 28h12"
		stroke={color}
		stroke-width="2"
		stroke-linecap="round"
	/>
</svg>
