<!--
  Grove Logo: Winter Grove (First Snow refined)
  TreePines + Lucide Snowflake icons
  Evokes: "The grove shelters, always. Even in winter."
-->
<script lang="ts">
	/**
	 * Grove Logo: Winter Grove
	 * Composed from Lucide: TreePine + snowflakes
	 */
	interface Props {
		class?: string;
		color?: string;
		snowColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		snowColor,
		title
	}: Props = $props();

	const snow = $derived(snowColor ?? '#e0f2fe');

	// Lucide TreePine
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};
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

	<!-- Left TreePine -->
	<g transform="translate(2, 4) scale(0.85)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Right TreePine (smaller, background) -->
	<g transform="translate(20, 8) scale(0.65)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Snow on branches (simple white caps) -->
	<path d="M6 10h6" stroke={snow} stroke-width="2.5" stroke-linecap="round" />
	<path d="M8 14h5" stroke={snow} stroke-width="2.5" stroke-linecap="round" />
	<path d="M5 18h8" stroke={snow} stroke-width="2" stroke-linecap="round" />

	<!-- Snowflakes falling (simplified 6-point stars) -->
	<g stroke={snow} stroke-width="1" stroke-linecap="round">
		<!-- Snowflake 1 -->
		<path d="M30 6v4M28 8h4M29 7l2 2M31 7l-2 2" opacity="0.8" />
		<!-- Snowflake 2 -->
		<path d="M18 3v3M16.5 4.5h3M17.2 3.8l1.6 1.6M18.8 3.8l-1.6 1.6" opacity="0.6" />
		<!-- Snowflake 3 -->
		<path d="M36 14v3M34.5 15.5h3" opacity="0.5" />
	</g>

	<!-- Snow on ground -->
	<path d="M2 28h36" stroke={snow} stroke-width="2" stroke-linecap="round" opacity="0.8" />
</svg>
