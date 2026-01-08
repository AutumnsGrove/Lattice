<!--
  Grove Logo: Enchanted Forest
  TreePine + TreeDeciduous + abundant fireflies + sparkle effects
  Evokes: "A fairy-tale grove. Magic in every shadow. Glowing and alive."
-->
<script lang="ts">
	/**
	 * Grove Logo: Enchanted Forest
	 * Composed from Lucide: TreePine, TreeDeciduous with magical accents
	 */
	interface Props {
		class?: string;
		color?: string;
		glowColor?: string;
		sparkleColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		glowColor,
		sparkleColor,
		title
	}: Props = $props();

	const glow = $derived(glowColor ?? '#a78bfa'); // Purple firefly glow
	const sparkle = $derived(sparkleColor ?? '#e879f9'); // Magenta sparkles

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
		<!-- Magical gradient background -->
		<linearGradient id="enchantedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#6366f1" stop-opacity="0.15" />
			<stop offset="100%" stop-color="#312e81" stop-opacity="0.1" />
		</linearGradient>

		<!-- Glow filter for trees -->
		<filter id="magicalGlow">
			<feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
			<feMerge>
				<feMergeNode in="coloredBlur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>

		<!-- Sparkle filter -->
		<filter id="sparkleGlow">
			<feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
			<feMerge>
				<feMergeNode in="coloredBlur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>

	<!-- Subtle magical gradient background -->
	<rect width="64" height="64" fill="url(#enchantedGradient)" rx="8" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES - Magical glow around them -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Left TreePine with glow -->
	<g filter="url(#magicalGlow)">
		<g transform="translate(8, 10) scale(0.75)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>
	</g>

	<!-- Right TreeDeciduous with glow -->
	<g filter="url(#magicalGlow)">
		<g transform="translate(38, 12) scale(0.65)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FIREFLIES - Abundant magical glow (8-10 fireflies) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Large fireflies (main glow points) -->
	<circle cx="24" cy="16" r="2" fill={glow} opacity="0.95" filter="url(#sparkleGlow)" />
	<circle cx="42" cy="20" r="1.8" fill={glow} opacity="0.85" filter="url(#sparkleGlow)" />
	<circle cx="20" cy="28" r="1.6" fill={glow} opacity="0.8" filter="url(#sparkleGlow)" />

	<!-- Medium fireflies -->
	<circle cx="32" cy="24" r="1.4" fill={glow} opacity="0.75" />
	<circle cx="16" cy="36" r="1.3" fill={glow} opacity="0.7" />
	<circle cx="46" cy="32" r="1.2" fill={glow} opacity="0.65" />

	<!-- Small fireflies (scattered magic) -->
	<circle cx="28" cy="38" r="1" fill={glow} opacity="0.6" />
	<circle cx="38" cy="40" r="0.9" fill={glow} opacity="0.55" />
	<circle cx="22" cy="44" r="0.8" fill={glow} opacity="0.5" />
	<circle cx="44" cy="46" r="0.85" fill={glow} opacity="0.58" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- SPARKLES - Tiny stars for magical accent -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Top sparkles -->
	<circle cx="12" cy="8" r="0.6" fill={sparkle} opacity="0.8" />
	<circle cx="52" cy="10" r="0.5" fill={sparkle} opacity="0.7" />
	<circle cx="30" cy="6" r="0.4" fill={sparkle} opacity="0.6" />

	<!-- Mid sparkles -->
	<circle cx="10" cy="22" r="0.5" fill={sparkle} opacity="0.65" />
	<circle cx="54" cy="26" r="0.6" fill={sparkle} opacity="0.72" />

	<!-- Bottom sparkles -->
	<circle cx="14" cy="50" r="0.45" fill={sparkle} opacity="0.6" />
	<circle cx="50" cy="52" r="0.55" fill={sparkle} opacity="0.68" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M8 56h48" stroke={color} stroke-width="1.2" stroke-linecap="round" opacity="0.25" />
</svg>
