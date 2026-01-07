<!--
  Grove Logo: Shelter
  Two TreePines creating an archway with Moon visible in gap
  Evokes: "Come in from the cold. The grove as gateway and protection."
-->
<script lang="ts">
	/**
	 * Grove Logo: Shelter
	 * Two pines forming an arch with moon in the gap
	 */
	interface Props {
		class?: string;
		color?: string;
		moonColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		moonColor,
		title
	}: Props = $props();

	const moon = $derived(moonColor ?? color);

	// Lucide TreePine
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};

	// Lucide Moon path
	const moonPath = 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401';
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

	<!-- Moon in the gap (centered, upper) -->
	<g transform="translate(10, 2) scale(0.35)" stroke={moon} stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
		<path d={moonPath} />
	</g>

	<!-- Left TreePine (angled right, creating left side of arch) -->
	<g transform="translate(-4, 6) scale(0.7) rotate(12, 12, 22)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Right TreePine (angled left, creating right side of arch) -->
	<g transform="translate(18, 6) scale(0.7) rotate(-12, 12, 22)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Ground -->
	<path d="M2 28h28" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
</svg>
