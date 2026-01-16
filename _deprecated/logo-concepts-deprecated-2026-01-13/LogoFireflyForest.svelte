<!--
  Grove Logo: Firefly Forest
  Lucide TreePine + TreeDeciduous + Sparkles composed together
  Evokes: "Magic happens here. The grove alive at night."
-->
<script lang="ts">
	/**
	 * Grove Logo: Firefly Forest
	 * Composed from actual Lucide icons: TreePine, TreeDeciduous, Sparkles
	 */
	interface Props {
		class?: string;
		color?: string;
		glowColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		glowColor,
		title
	}: Props = $props();

	const glow = $derived(glowColor ?? '#fde047');

	// Lucide icon paths (24x24 viewBox)
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};

	const treeDeciduous = {
		canopy: 'M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z',
		trunk: 'M12 19v3'
	};
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 48 32"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- Left: Lucide TreePine (scaled and positioned) -->
	<g transform="translate(2, 4) scale(0.9)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Right: Lucide TreeDeciduous (scaled, positioned, slightly smaller for depth) -->
	<g transform="translate(26, 6) scale(0.75)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Fireflies (simplified sparkle dots) -->
	<circle cx="22" cy="10" r="2" fill={glow} opacity="0.9" />
	<circle cx="26" cy="16" r="1.5" fill={glow} opacity="0.7" />
	<circle cx="20" cy="18" r="1.2" fill={glow} opacity="0.8" />
	<circle cx="30" cy="12" r="1" fill={glow} opacity="0.6" />
	<circle cx="24" cy="22" r="1.3" fill={glow} opacity="0.5" />

	<!-- Ground line -->
	<path d="M2 28h44" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
</svg>
