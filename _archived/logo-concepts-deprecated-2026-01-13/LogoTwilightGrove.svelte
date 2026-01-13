<!--
  Grove Logo: Twilight Grove
  TreePine + TreeDeciduous + Crescent Moon + Stars
  Evokes: "The magic hour. Day fading, night arriving. The grove in transition."
-->
<script lang="ts">
	/**
	 * Grove Logo: Twilight Grove
	 * Composed from Lucide: TreePine, TreeDeciduous, Moon
	 * Theme: The blue hour—where warm day tones fade to cool night
	 */
	interface Props {
		class?: string;
		treeColor?: string;
		skyColor?: string;
		moonColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		treeColor = '#059669',
		skyColor = '#4c1d95',
		moonColor = '#fef08a',
		title
	}: Props = $props();

	// Lucide TreePine paths
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};

	// Lucide TreeDeciduous paths
	const treeDeciduous = {
		canopy: 'M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z',
		trunk: 'M12 19v3'
	};

	// Lucide Moon path
	const moon = 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401';
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

	<!-- Define gradients for twilight sky effect -->
	<defs>
		<!-- Purple to indigo twilight gradient -->
		<linearGradient id="twilightSky" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#a78bfa" stop-opacity="0.3" />
			<stop offset="50%" stop-color="#7c3aed" stop-opacity="0.4" />
			<stop offset="100%" stop-color="#4c1d95" stop-opacity="0.5" />
		</linearGradient>

		<!-- Warm-to-cool tree color gradient -->
		<linearGradient id="warmToCool" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#ea580c" />
			<stop offset="50%" stop-color="#059669" />
			<stop offset="100%" stop-color="#1e40af" />
		</linearGradient>
	</defs>

	<!-- Twilight sky background -->
	<rect width="80" height="64" fill="url(#twilightSky)" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- CRESCENT MOON (upper right) - the first celestial object -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<g transform="translate(58, 4) scale(0.5)" stroke={moonColor} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
		<path d={moon} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FIRST STARS (appearing as dusk deepens) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<circle cx="12" cy="8" r="1.2" fill={moonColor} opacity="0.9" />
	<circle cx="28" cy="6" r="0.8" fill={moonColor} opacity="0.7" />
	<circle cx="22" cy="14" r="0.6" fill={moonColor} opacity="0.5" />
	<circle cx="68" cy="16" r="0.7" fill={moonColor} opacity="0.6" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES IN TWILIGHT (warm day colors transitioning to cool night) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Left background tree (smallest, warmest - still catching sunlight) -->
	<g transform="translate(8, 32) scale(0.6)" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Center-left tree (medium, transitioning to cool) -->
	<g transform="translate(22, 22) scale(0.75)" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Center tree (largest, the hero - balanced day/night) -->
	<g transform="translate(38, 18) scale(0.85)" stroke="#1e40af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Center-right tree (medium, cool dusk tones) -->
	<g transform="translate(54, 24) scale(0.7)" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Right background tree (small, deepest night blue) -->
	<g transform="translate(68, 36) scale(0.55)" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.65">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- HORIZON LINE (subtle ground marker) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<path d="M4 52h72" stroke={treeColor} stroke-width="1.2" stroke-linecap="round" opacity="0.2" />
</svg>
