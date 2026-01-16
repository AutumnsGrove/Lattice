<!--
  Grove Logo: First Frost
  Autumn trees with ice-blue sparkles/snowflakes drifting down
  Evokes: "That morning when autumn meets winter. Leaves still warm, air turning cold."
-->
<script lang="ts">
	/**
	 * Grove Logo: First Frost
	 * Autumn palette with ice-blue winter sparkles
	 * Trees grounded, sparkles drift like first snowflakes
	 */
	interface Props {
		class?: string;
		color?: string;
		frostColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color,
		frostColor,
		title
	}: Props = $props();

	const treeColor = $derived(color ?? '#b45309');
	const frost = $derived(frostColor ?? '#93c5fd'); // Ice blue

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
	viewBox="0 0 64 64"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<defs>
		<!-- Cool-warm gradient background -->
		<linearGradient id="firstFrostGradient" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#bfdbfe" stop-opacity="0.1" />
			<stop offset="100%" stop-color="#d97706" stop-opacity="0.06" />
		</linearGradient>

		<!-- Autumn to winter tree gradient -->
		<linearGradient id="firstFrostLeaves" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#ea580c" />
			<stop offset="70%" stop-color="#b45309" />
			<stop offset="100%" stop-color="#78350f" />
		</linearGradient>

		<!-- Frost glow filter -->
		<filter id="frostGlow">
			<feGaussianBlur stdDeviation="0.8" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>

	<!-- Background -->
	<rect width="64" height="64" fill="url(#firstFrostGradient)" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUNDED AUTUMN TREES - late season, some leaves gone -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Back left pine (faded, winter-touched) -->
	<g
		transform="translate(2, 30) scale(0.6)"
		stroke="#78350f"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.35"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Back right deciduous (sparse, darker) -->
	<g
		transform="translate(46, 28) scale(0.62)"
		stroke="#92400e"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.4"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Mid-left deciduous (rich amber, still holding leaves) -->
	<g
		transform="translate(8, 20) scale(0.75)"
		stroke="#d97706"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.7"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Mid-right pine (rusty orange) -->
	<g
		transform="translate(38, 22) scale(0.7)"
		stroke="#c2410c"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.68"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Hero tree (center, autumn gradient) -->
	<g
		transform="translate(22, 14) scale(0.9)"
		stroke="url(#firstFrostLeaves)"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.92"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- ICE-BLUE FROST SPARKLES - first snowflakes of winter -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Large frost particles (high, catching light) -->
	<circle cx="10" cy="8" r="2.2" fill={frost} opacity="0.85" filter="url(#frostGlow)" />
	<circle cx="52" cy="6" r="1.8" fill={frost} opacity="0.8" filter="url(#frostGlow)" />
	<circle cx="30" cy="10" r="1.6" fill={frost} opacity="0.75" filter="url(#frostGlow)" />

	<!-- Medium frost (drifting down) -->
	<circle cx="6" cy="22" r="1.4" fill={frost} opacity="0.7" />
	<circle cx="56" cy="18" r="1.3" fill={frost} opacity="0.65" />
	<circle cx="42" cy="14" r="1.1" fill={frost} opacity="0.6" />

	<!-- Small frost (floating between trees) -->
	<circle cx="16" cy="32" r="1" fill={frost} opacity="0.55" />
	<circle cx="48" cy="30" r="0.9" fill={frost} opacity="0.5" />
	<circle cx="4" cy="40" r="0.85" fill={frost} opacity="0.48" />
	<circle cx="58" cy="36" r="0.8" fill={frost} opacity="0.45" />

	<!-- Tiny frost settling near ground -->
	<circle cx="12" cy="48" r="0.7" fill={frost} opacity="0.4" />
	<circle cx="50" cy="50" r="0.6" fill={frost} opacity="0.35" />
	<circle cx="28" cy="52" r="0.55" fill={frost} opacity="0.32" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE - cold earth -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M4 54h56" stroke={treeColor} stroke-width="1.5" stroke-linecap="round" opacity="0.25" />

	<!-- Thin frost line on ground -->
	<path d="M8 55h48" stroke={frost} stroke-width="0.8" stroke-linecap="round" opacity="0.15" />
</svg>
