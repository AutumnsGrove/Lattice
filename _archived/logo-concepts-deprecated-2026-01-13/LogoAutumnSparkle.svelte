<!--
  Grove Logo: Autumn Sparkle
  Autumn trees (grounded!) with purple floating sparkles like snow
  Evokes: "The first hint of magic in the autumn air. Sparkles drift through crisp leaves."
-->
<script lang="ts">
	/**
	 * Grove Logo: Autumn Sparkle
	 * Combines HarvestGrove autumn palette with EnchantedForest sparkles
	 * Trees are properly grounded with trunk bases touching the ground line
	 */
	interface Props {
		class?: string;
		color?: string;
		sparkleColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color,
		sparkleColor,
		title
	}: Props = $props();

	const treeColor = $derived(color ?? '#b45309');
	const sparkle = $derived(sparkleColor ?? '#a78bfa'); // Purple sparkles

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
		<!-- Soft warm background -->
		<linearGradient id="autumnSparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#92400e" stop-opacity="0.06" />
			<stop offset="100%" stop-color="#a78bfa" stop-opacity="0.08" />
		</linearGradient>

		<!-- Autumn foliage gradient -->
		<linearGradient id="autumnSparkleLeaves" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#dc2626" />
			<stop offset="50%" stop-color="#d97706" />
			<stop offset="100%" stop-color="#b45309" />
		</linearGradient>

		<!-- Sparkle glow filter -->
		<filter id="autumnSparkleGlow">
			<feGaussianBlur stdDeviation="0.6" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>

	<!-- Background -->
	<rect width="64" height="64" fill="url(#autumnSparkleGradient)" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUNDED AUTUMN TREES - properly positioned so trunks hit ground -->
	<!-- Ground line at y=54, so scale 0.8 tree (trunk at y=22*0.8=17.6) -->
	<!-- needs translate Y of ~36 to reach ground (36 + 17.6 ≈ 54) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Back left tree (small, faded rust) -->
	<g
		transform="translate(4, 32) scale(0.55)"
		stroke="#a16207"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.4"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Back right tree (small, deep amber) -->
	<g
		transform="translate(44, 30) scale(0.6)"
		stroke="#b45309"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.45"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Mid-left tree (warm orange) -->
	<g
		transform="translate(10, 22) scale(0.72)"
		stroke="#d97706"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.75"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Mid-right tree (rich rust) -->
	<g
		transform="translate(36, 24) scale(0.68)"
		stroke="#c2410c"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.7"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Hero tree (center, autumn gradient) -->
	<g
		transform="translate(22, 16) scale(0.88)"
		stroke="url(#autumnSparkleLeaves)"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.95"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FLOATING PURPLE SPARKLES - like magical snow drifting down -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Large sparkles (high, prominent) -->
	<circle cx="12" cy="10" r="2" fill={sparkle} opacity="0.9" filter="url(#autumnSparkleGlow)" />
	<circle cx="50" cy="8" r="1.8" fill={sparkle} opacity="0.85" filter="url(#autumnSparkleGlow)" />
	<circle cx="32" cy="6" r="1.5" fill={sparkle} opacity="0.8" filter="url(#autumnSparkleGlow)" />

	<!-- Medium sparkles (mid-height, drifting) -->
	<circle cx="8" cy="24" r="1.4" fill={sparkle} opacity="0.75" />
	<circle cx="54" cy="20" r="1.3" fill={sparkle} opacity="0.7" />
	<circle cx="28" cy="18" r="1.2" fill={sparkle} opacity="0.65" />

	<!-- Small sparkles (lower, floating between trees) -->
	<circle cx="18" cy="34" r="1" fill={sparkle} opacity="0.6" />
	<circle cx="44" cy="32" r="0.9" fill={sparkle} opacity="0.55" />
	<circle cx="6" cy="42" r="0.8" fill={sparkle} opacity="0.5" />
	<circle cx="56" cy="38" r="0.85" fill={sparkle} opacity="0.52" />

	<!-- Tiny sparkles (near ground, settling) -->
	<circle cx="14" cy="48" r="0.6" fill={sparkle} opacity="0.4" />
	<circle cx="48" cy="46" r="0.55" fill={sparkle} opacity="0.38" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE - autumn earth -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M4 54h56" stroke={treeColor} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
</svg>
