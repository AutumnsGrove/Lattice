<!--
  Grove Logo: Dawn Forest
  Lucide TreePine + TreeDeciduous in silhouette + rising sun
  Evokes: "The grove at first light. Warm, hopeful, beginning."
-->
<script lang="ts">
	/**
	 * Grove Logo: Dawn Forest
	 * Composed from Lucide TreePine, TreeDeciduous with warm dawn gradient
	 */
	interface Props {
		class?: string;
		color?: string;
		skyGradientStart?: string;
		skyGradientEnd?: string;
		sunColor?: string;
		mistColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = '#1f2937',
		skyGradientStart,
		skyGradientEnd,
		sunColor,
		mistColor,
		title
	}: Props = $props();

	// Default warm dawn gradient colors (rose -> orange -> gold)
	const defaultSkyStart = $derived(skyGradientStart ?? '#fca5a5');
	const defaultSkyEnd = $derived(skyGradientEnd ?? '#fbbf24');
	const defaultSun = $derived(sunColor ?? '#fb923c');
	const defaultMist = $derived(mistColor ?? '#fed7aa');

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
	viewBox="0 0 80 64"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<defs>
		<!-- Warm dawn sky gradient: rose -> orange -> gold -->
		<linearGradient id="dawnSky" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color={defaultSkyStart} />
			<stop offset="50%" stop-color="#f97316" />
			<stop offset="100%" stop-color={defaultSkyEnd} />
		</linearGradient>

		<!-- Soft mist/fog gradient for morning haze effect -->
		<linearGradient id="mistGlow" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color={defaultMist} stop-opacity="0" />
			<stop offset="70%" stop-color={defaultMist} stop-opacity="0.15" />
			<stop offset="100%" stop-color={defaultMist} stop-opacity="0.3" />
		</linearGradient>

		<!-- Golden sun glow filter -->
		<filter id="sunGlow">
			<feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
		</filter>

		<!-- Soft shadow for trees -->
		<filter id="treeShadow">
			<feGaussianBlur in="SourceGraphic" stdDeviation="0.8" />
		</filter>
	</defs>

	<!-- Background sky gradient -->
	<rect width="80" height="64" fill="url(#dawnSky)" />

	<!-- Rising sun (semi-circle at horizon) -->
	<g filter="url(#sunGlow)">
		<circle cx="68" cy="48" r="8" fill={defaultSun} opacity="0.9" />
		<circle cx="68" cy="48" r="6" fill={defaultSun} opacity="0.6" />
	</g>

	<!-- Mist/fog overlay for morning atmosphere -->
	<rect width="80" height="64" fill="url(#mistGlow)" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES - 4 in silhouette, layered for depth -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Far left tree (small, back) -->
	<g transform="translate(4, 32) scale(0.55)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Left-center tree (medium, mid-depth) -->
	<g transform="translate(16, 24) scale(0.7)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7" filter="url(#treeShadow)">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Center-right tree (large, foreground) -->
	<g transform="translate(34, 16) scale(0.85)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Far right tree (medium-small, back) -->
	<g transform="translate(56, 28) scale(0.65)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE - Subtle horizon -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M0 48h80" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.25" />
</svg>
