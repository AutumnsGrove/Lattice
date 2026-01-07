<!--
  Grove Logo: Starlight Pines
  Two TreePines + Moon + stars
  Evokes: "The grove at night. Find your place under the stars."
-->
<script lang="ts">
	/**
	 * Grove Logo: Starlight Pines
	 * Composed from Lucide: TreePine, Moon
	 */
	interface Props {
		class?: string;
		color?: string;
		celestialColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		celestialColor,
		title
	}: Props = $props();

	const celestial = $derived(celestialColor ?? color);

	// Lucide TreePine paths
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};

	// Lucide Moon path
	const moon = 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401';
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 40 32"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- Lucide Moon (upper right) -->
	<g transform="translate(24, -2) scale(0.45)" stroke={celestial} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
		<path d={moon} />
	</g>

	<!-- Stars -->
	<circle cx="8" cy="4" r="1" fill={celestial} />
	<circle cx="18" cy="2" r="0.8" fill={celestial} opacity="0.7" />
	<circle cx="14" cy="6" r="0.6" fill={celestial} opacity="0.5" />

	<!-- Left TreePine (larger, foreground) -->
	<g transform="translate(2, 6) scale(0.85)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Right TreePine (smaller, background) -->
	<g transform="translate(20, 10) scale(0.6)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Ground -->
	<path d="M2 28h36" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
</svg>
