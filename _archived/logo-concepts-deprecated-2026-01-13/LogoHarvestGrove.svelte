<!--
  Grove Logo: Harvest Grove
  TreePine + TreeDeciduous in rich autumn colors with harvest accents
  Evokes: "The grove at peak fall. Abundant, warm, cozy harvest moon."
-->
<script lang="ts">
	/**
	 * Grove Logo: Harvest Grove
	 * Autumn composition with rich gradients and harvest accents
	 */
	interface Props {
		class?: string;
		color?: string;
		accentColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color,
		accentColor,
		title
	}: Props = $props();

	// Autumn harvest palette
	const harvestColor = $derived(color ?? '#b45309');      // Deep rust/amber
	const harvestAccent = $derived(accentColor ?? '#d97706'); // Warm amber

	// Lucide icon paths (24x24 viewBox)
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};

	const treeDeciduous = {
		canopy: 'M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z',
		trunk: 'M12 19v3'
	};

	// Mushroom accent (simple SVG)
	const mushroom = 'M8 14h8v1h-8zm-1 1h10v2H7zm1 3h8v1H8z';
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 64 64"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- Gradient definitions for rich autumn look -->
	<defs>
		<!-- Warm rust-to-gold gradient background -->
		<linearGradient id="harvestGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#92400e" stop-opacity="0.08" />
			<stop offset="100%" stop-color="#d97706" stop-opacity="0.12" />
		</linearGradient>

		<!-- Autumn foliage gradient (orange to gold) -->
		<linearGradient id="autumnLeaves" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#dc2626" />
			<stop offset="50%" stop-color="#d97706" />
			<stop offset="100%" stop-color="#b45309" />
		</linearGradient>

		<!-- Harvest gold accent -->
		<linearGradient id="harvestGold" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#fbbf24" />
			<stop offset="100%" stop-color="#d97706" />
		</linearGradient>
	</defs>

	<!-- Soft circular background for depth -->
	<circle
		cx="32"
		cy="32"
		r="30"
		fill="url(#harvestGradient)"
		stroke={harvestColor}
		stroke-width="0.5"
		opacity="0.6"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- AUTUMN TREES - Composition -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Back left tree (faded, deciduous) -->
	<g
		transform="translate(8, 16) scale(0.6)"
		stroke="#a16207"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.4"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Back right tree (faded, pine) -->
	<g
		transform="translate(46, 14) scale(0.55)"
		stroke="#b45309"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.35"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Mid-left tree (warm amber) -->
	<g
		transform="translate(12, 10) scale(0.75)"
		stroke="#d97706"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.75"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Mid-right tree (rich rust-red) -->
	<g
		transform="translate(38, 12) scale(0.7)"
		stroke="#c2410c"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.7"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Hero tree (center, largest, brightest autumn) -->
	<g
		transform="translate(26, 4) scale(0.95)"
		stroke="url(#autumnLeaves)"
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.95"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- HARVEST ACCENTS - Pumpkin/Mushroom details -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Small pumpkin accent (left base) -->
	<circle cx="16" cy="48" r="2.5" fill="#ea580c" opacity="0.85" />
	<path
		d="M14 48a2 2 0 0 0 4 0"
		stroke="#b45309"
		stroke-width="1"
		opacity="0.6"
		stroke-linecap="round"
	/>

	<!-- Small mushroom accent (right base) -->
	<ellipse cx="48" cy="50" rx="2" ry="1.5" fill="#a16207" opacity="0.7" />
	<rect x="46.5" y="51" width="3" height="2" fill="#a16207" opacity="0.6" rx="0.5" />

	<!-- Harvest gold accent dots (fallen leaves) -->
	<circle cx="24" cy="42" r="1" fill="url(#harvestGold)" opacity="0.8" />
	<circle cx="38" cy="44" r="0.8" fill="#fbbf24" opacity="0.7" />
	<circle cx="32" cy="50" r="0.9" fill="#d97706" opacity="0.75" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE - Harvest earth -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path
		d="M6 54h52"
		stroke={harvestColor}
		stroke-width="1.5"
		stroke-linecap="round"
		opacity="0.3"
	/>

	<!-- Subtle soil texture -->
	<line x1="12" y1="55" x2="18" y2="55" stroke={harvestColor} stroke-width="0.8" opacity="0.15" />
	<line x1="28" y1="56" x2="36" y2="56" stroke={harvestColor} stroke-width="0.8" opacity="0.15" />
	<line x1="46" y1="55" x2="52" y2="55" stroke={harvestColor} stroke-width="0.8" opacity="0.15" />
</svg>
