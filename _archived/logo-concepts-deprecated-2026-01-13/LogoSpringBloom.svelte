<!--
  Grove Logo: Spring Bloom
  Cherry blossom grove in renewal - TreePine + TreeDeciduous with pink accents + falling petals
  Evokes: "The grove awakens. Life returns in soft pink waves. Hope blooming anew."
-->
<script lang="ts">
	/**
	 * Grove Logo: Spring Bloom
	 * Composed from Lucide: TreePine, TreeDeciduous with blossom accents
	 * Theme: Cherry blossoms, renewal, soft pastoral energy
	 */
	interface Props {
		class?: string;
		treeColor?: string;
		blossomColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		treeColor = '#4b7c59',
		blossomColor = '#e879a9',
		title
	}: Props = $props();

	const bloom = $derived(blossomColor);
	const tree = $derived(treeColor);

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

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- BACKGROUND GRADIENT - Soft pink to pale rose -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	<defs>
		<linearGradient id="springGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#fce7f3" stop-opacity="0.6" />
			<stop offset="100%" stop-color="#fbcfe8" stop-opacity="0.5" />
		</linearGradient>
		<radialGradient id="blossomGlow" cx="30%" cy="30%">
			<stop offset="0%" stop-color="#fda4d0" stop-opacity="0.3" />
			<stop offset="100%" stop-color="#f472b6" stop-opacity="0.1" />
		</radialGradient>
	</defs>

	<!-- Soft background wash -->
	<rect width="64" height="64" fill="url(#springGradient)" />
	<rect width="64" height="64" fill="url(#blossomGlow)" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES - Two trees, slightly angled toward center -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Left TreePine (with blossom clusters) -->
	<g transform="translate(6, 14) scale(0.75)" stroke={tree} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Left tree blossom clusters (small circles at canopy) -->
	<circle cx="12" cy="18" r="2" fill={bloom} opacity="0.85" />
	<circle cx="16" cy="16" r="1.5" fill={bloom} opacity="0.75" />
	<circle cx="10" cy="22" r="1.2" fill={bloom} opacity="0.7" />

	<!-- Right TreeDeciduous (with blossom clusters) -->
	<g transform="translate(38, 16) scale(0.7)" stroke={tree} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Right tree blossom clusters (small circles at canopy) -->
	<circle cx="48" cy="18" r="2" fill={bloom} opacity="0.85" />
	<circle cx="52" cy="20" r="1.5" fill={bloom} opacity="0.75" />
	<circle cx="46" cy="24" r="1.2" fill={bloom} opacity="0.7" />

	<!-- Center small accent TreePine (background, muted) -->
	<g transform="translate(26, 20) scale(0.5)" stroke={tree} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FALLING PETALS - Soft pink circles drifting down -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Petal 1 (top left) -->
	<circle cx="8" cy="12" r="1.2" fill={bloom} opacity="0.65" />

	<!-- Petal 2 (center-right) -->
	<circle cx="50" cy="28" r="1" fill={bloom} opacity="0.55" />

	<!-- Petal 3 (bottom center) -->
	<circle cx="28" cy="48" r="0.9" fill={bloom} opacity="0.45" />

	<!-- Petal 4 (far right) -->
	<circle cx="56" cy="42" r="1.1" fill={bloom} opacity="0.5" />

	<!-- Petal 5 (left edge) -->
	<circle cx="4" cy="38" r="0.8" fill={bloom} opacity="0.4" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE - Subtle, soft -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M4 54h56" stroke={tree} stroke-width="1" stroke-linecap="round" opacity="0.2" />
</svg>
