<!--
  Grove Logo: Storm Forest
  TreePine + TreeDeciduous bent in wind + rain/lightning accents
  Evokes: "Shelter in the storm. The grove stands strong."
-->
<script lang="ts">
	/**
	 * Grove Logo: Storm Forest
	 * Composed from Lucide: TreePine, TreeDeciduous - bent/rotated for wind effect
	 * Dark, moody gradient with rain and drama
	 */
	interface Props {
		class?: string;
		color?: string;
		stormColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-8 h-8',
		color = 'currentColor',
		stormColor,
		title
	}: Props = $props();

	const storm = $derived(stormColor ?? '#cbd5e1');

	// Lucide TreePine
	const treePine = {
		canopy: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
		trunk: 'M12 22v-3'
	};

	// Lucide TreeDeciduous
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

	<!-- Dark moody gradient background -->
	<defs>
		<linearGradient id="stormGradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#334155" stop-opacity="0.15" />
			<stop offset="100%" stop-color="#0f172a" stop-opacity="0.2" />
		</linearGradient>
		<filter id="stormBlur" x="-10%" y="-10%" width="120%" height="120%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
		</filter>
	</defs>

	<!-- Subtle gradient overlay -->
	<rect
		x="0"
		y="0"
		width="64"
		height="64"
		fill="url(#stormGradient)"
		rx="4"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- RAIN DROPS (diagonal lines suggesting wind) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<g stroke={storm} stroke-width="0.8" stroke-linecap="round" opacity="0.6">
		<!-- Left side rain -->
		<line x1="8" y1="4" x2="6" y2="10" />
		<line x1="14" y1="6" x2="12" y2="14" />
		<line x1="10" y1="12" x2="8" y2="20" />
		<!-- Center rain -->
		<line x1="28" y1="2" x2="24" y2="12" />
		<line x1="36" y1="4" x2="32" y2="14" />
		<line x1="32" y1="10" x2="28" y2="20" />
		<!-- Right side rain -->
		<line x1="48" y1="6" x2="44" y2="16" />
		<line x1="56" y1="4" x2="52" y2="14" />
	</g>

	<!-- Lightning bolt accent (subtle, upper right) -->
	<path
		d="M54 6 L52 12 L56 14 L52 22"
		stroke={storm}
		stroke-width="1"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.5"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES - BENT IN WIND (rotated with origin shift) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Left TreePine (leaning right, as if pushed by wind) -->
	<g
		transform="translate(10, 16) rotate(8)"
		stroke={color}
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.9"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Center TreeDeciduous (upright, sheltered) -->
	<g
		transform="translate(24, 14) scale(1.1)"
		stroke={color}
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="1"
	>
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Right TreePine (leaning left, bent by wind) -->
	<g
		transform="translate(42, 16) rotate(-12)"
		stroke={color}
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		opacity="0.85"
	>
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- WIND EFFECT (curved lines suggesting motion) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<g stroke={storm} stroke-width="0.6" fill="none" opacity="0.4">
		<path d="M6 24 Q15 22 20 26" />
		<path d="M44 28 Q52 26 58 30" />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE (solid, anchoring element) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path
		d="M2 44h60"
		stroke={color}
		stroke-width="1.2"
		stroke-linecap="round"
		opacity="0.4"
	/>

	<!-- Deep ground shadow for weight/shelter -->
	<path
		d="M4 46 Q8 48 12 46 Q16 48 20 46 Q24 48 28 46 Q32 48 36 46 Q40 48 44 46 Q48 48 52 46 Q56 48 60 46"
		stroke={color}
		stroke-width="0.8"
		stroke-linecap="round"
		opacity="0.2"
	/>
</svg>
