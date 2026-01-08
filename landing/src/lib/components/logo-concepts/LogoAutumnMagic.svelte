<!--
  Grove Logo: Autumn Magic
  Trees in warm-to-cool gradient (like TwilightGrove) with autumn colors
  Mixed golden and purple sparkles for rich magical atmosphere
  Evokes: "When autumn twilight blurs the line between warm and cool, day and night."
-->
<script lang="ts">
	/**
	 * Grove Logo: Autumn Magic
	 * Combines TwilightGrove's warm-to-cool transition with autumn palette
	 * Mixed sparkle colors (gold + purple) for rich atmosphere
	 * Trees properly grounded
	 */
	interface Props {
		class?: string;
		color?: string;
		warmSparkle?: string;
		coolSparkle?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color,
		warmSparkle,
		coolSparkle,
		title
	}: Props = $props();

	const treeColor = $derived(color ?? '#b45309');
	const goldSparkle = $derived(warmSparkle ?? '#fbbf24'); // Golden
	const purpleSparkle = $derived(coolSparkle ?? '#a78bfa'); // Purple

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
		<!-- Warm-to-cool gradient background -->
		<linearGradient id="autumnMagicBg" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#fbbf24" stop-opacity="0.08" />
			<stop offset="50%" stop-color="#a78bfa" stop-opacity="0.06" />
			<stop offset="100%" stop-color="#6366f1" stop-opacity="0.08" />
		</linearGradient>

		<!-- Warm autumn gradient for left trees -->
		<linearGradient id="warmAutumn" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#dc2626" />
			<stop offset="100%" stop-color="#d97706" />
		</linearGradient>

		<!-- Cool autumn gradient for right trees -->
		<linearGradient id="coolAutumn" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#7c3aed" />
			<stop offset="100%" stop-color="#4c1d95" />
		</linearGradient>

		<!-- Golden glow filter -->
		<filter id="goldGlow">
			<feGaussianBlur stdDeviation="0.7" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>

		<!-- Purple glow filter -->
		<filter id="purpleGlow">
			<feGaussianBlur stdDeviation="0.6" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>

	<!-- Background -->
	<rect width="64" height="64" fill="url(#autumnMagicBg)" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MAIN TREES (ROW 1) - warm on left, transitioning to cool on right -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Far left background (warmest, small) -->
	<g
		transform="translate(2, 32) scale(0.55)"
		stroke="#ea580c"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.4"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Far right background (coolest, small) -->
	<g
		transform="translate(48, 30) scale(0.58)"
		stroke="#6366f1"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.38"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Left tree (warm amber-red) -->
	<g
		transform="translate(8, 20) scale(0.75)"
		stroke="url(#warmAutumn)"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.78"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Right tree (cool purple-indigo) -->
	<g
		transform="translate(38, 22) scale(0.7)"
		stroke="url(#coolAutumn)"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.72"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Center hero tree (transitional - warm rust) -->
	<g
		transform="translate(22, 14) scale(0.9)"
		stroke="#b45309"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.92"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- "GROVE" TEXT - centered in row 1, Lexend font -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<text
		x="32"
		y="42"
		text-anchor="middle"
		font-family="Lexend, system-ui, sans-serif"
		font-size="10"
		font-weight="600"
		fill="#fef3c7"
		opacity="0.95"
	>Grove</text>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FOREGROUND TREES (ROW 2) - 7 smaller trees along the bottom -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Foreground 1 (far left, warm orange) -->
	<g
		transform="translate(-4, 42) scale(0.45)"
		stroke="#f59e0b"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.55"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Foreground 2 (orange-amber) -->
	<g
		transform="translate(6, 41) scale(0.48)"
		stroke="#ea580c"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.52"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Foreground 3 (amber) -->
	<g
		transform="translate(16, 42) scale(0.44)"
		stroke="#d97706"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.5"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Foreground 4 (center, rust-purple transition) -->
	<g
		transform="translate(26, 41) scale(0.46)"
		stroke="#9333ea"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.48"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Foreground 5 (purple) -->
	<g
		transform="translate(36, 42) scale(0.45)"
		stroke="#8b5cf6"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.5"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Foreground 6 (violet-indigo) -->
	<g
		transform="translate(46, 41) scale(0.47)"
		stroke="#7c3aed"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.52"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Foreground 7 (far right, indigo) -->
	<g
		transform="translate(54, 42) scale(0.44)"
		stroke="#6366f1"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.55"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GOLDEN SPARKLES - warm side (left half of sky) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<circle cx="8" cy="8" r="2" fill={goldSparkle} opacity="0.9" filter="url(#goldGlow)" />
	<circle cx="20" cy="6" r="1.5" fill={goldSparkle} opacity="0.8" filter="url(#goldGlow)" />
	<circle cx="6" cy="20" r="1.2" fill={goldSparkle} opacity="0.7" />
	<circle cx="16" cy="28" r="1" fill={goldSparkle} opacity="0.6" />
	<circle cx="4" cy="38" r="0.8" fill={goldSparkle} opacity="0.5" />
	<circle cx="12" cy="46" r="0.65" fill={goldSparkle} opacity="0.4" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- PURPLE SPARKLES - cool side (right half of sky) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<circle cx="54" cy="6" r="1.8" fill={purpleSparkle} opacity="0.85" filter="url(#purpleGlow)" />
	<circle cx="44" cy="10" r="1.4" fill={purpleSparkle} opacity="0.75" filter="url(#purpleGlow)" />
	<circle cx="58" cy="18" r="1.1" fill={purpleSparkle} opacity="0.65" />
	<circle cx="48" cy="26" r="0.95" fill={purpleSparkle} opacity="0.55" />
	<circle cx="56" cy="34" r="0.8" fill={purpleSparkle} opacity="0.48" />
	<circle cx="50" cy="44" r="0.6" fill={purpleSparkle} opacity="0.38" />

	<!-- Center mixed sparkles (transition zone) -->
	<circle cx="32" cy="8" r="1.3" fill={goldSparkle} opacity="0.6" />
	<circle cx="36" cy="16" r="1" fill={purpleSparkle} opacity="0.5" />
	<circle cx="28" cy="50" r="0.5" fill={goldSparkle} opacity="0.35" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M4 54h56" stroke={treeColor} stroke-width="1.5" stroke-linecap="round" opacity="0.28" />
</svg>
