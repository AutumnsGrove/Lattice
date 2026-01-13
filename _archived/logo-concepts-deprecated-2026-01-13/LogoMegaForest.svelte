<!--
  Grove Logo: The Mega Forest
  A panoramic composition combining ALL the forest elements:
  Multiple TreePines, TreeDeciduous, Moon, stars, fireflies, hearth
  Evokes: "The entire grove, alive and breathing. Come home."
-->
<script lang="ts">
	/**
	 * Grove Logo: The Mega Forest
	 * A panoramic showcase of everything the grove can be
	 */
	interface Props {
		class?: string;
		color?: string;
		moonColor?: string;
		fireColor?: string;
		glowColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-full h-auto',
		color = 'currentColor',
		moonColor,
		fireColor,
		glowColor,
		title
	}: Props = $props();

	const moon = $derived(moonColor ?? color);
	const fire = $derived(fireColor ?? '#f97316');
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

	const moonPath = 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401';

	const flame = 'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4';
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 200 60"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- SKY LAYER - Moon and Stars -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Moon (upper right area) -->
	<g transform="translate(160, 2) scale(0.5)" stroke={moon} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
		<path d={moonPath} />
	</g>

	<!-- Stars scattered across the sky -->
	<circle cx="15" cy="8" r="1.2" fill={moon} opacity="0.8" />
	<circle cx="35" cy="5" r="0.8" fill={moon} opacity="0.6" />
	<circle cx="55" cy="10" r="1" fill={moon} opacity="0.7" />
	<circle cx="80" cy="4" r="0.9" fill={moon} opacity="0.5" />
	<circle cx="105" cy="7" r="1.1" fill={moon} opacity="0.8" />
	<circle cx="130" cy="3" r="0.7" fill={moon} opacity="0.6" />
	<circle cx="145" cy="9" r="0.8" fill={moon} opacity="0.7" />
	<circle cx="185" cy="6" r="1" fill={moon} opacity="0.5" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- BACKGROUND FOREST LAYER (smallest, most transparent) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Far background pines (tiny, faded) -->
	<g transform="translate(8, 30) scale(0.4)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(25, 32) scale(0.35)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(60, 28) scale(0.45)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(95, 31) scale(0.38)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.28">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(125, 29) scale(0.42)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(150, 33) scale(0.36)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(175, 30) scale(0.4)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.28">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MID-GROUND FOREST LAYER -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Mid-layer trees (medium size, semi-transparent) -->
	<g transform="translate(0, 22) scale(0.55)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(18, 20) scale(0.6)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(42, 23) scale(0.52)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(70, 18) scale(0.65)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(110, 21) scale(0.58)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(138, 19) scale(0.62)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.58">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(165, 22) scale(0.55)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.52">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(185, 20) scale(0.58)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FOREGROUND FOREST LAYER (largest, most opaque) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Large foreground trees -->
	<g transform="translate(-5, 10) scale(0.85)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(22, 14) scale(0.75)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(48, 8) scale(0.9)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(78, 12) scale(0.8)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.88">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(115, 6) scale(0.95)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>
	<g transform="translate(145, 11) scale(0.82)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.86">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>
	<g transform="translate(172, 9) scale(0.88)" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- HEARTH (center focal point) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Fire glow -->
	<circle cx="100" cy="48" r="6" fill={fire} opacity="0.15" />
	<circle cx="100" cy="48" r="4" fill={fire} opacity="0.25" />

	<!-- Flame icon -->
	<g transform="translate(94, 38) scale(0.5)" stroke={fire} stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
		<path d={flame} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FIREFLIES (scattered magic) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<circle cx="30" cy="25" r="1.8" fill={glow} opacity="0.9" />
	<circle cx="45" cy="35" r="1.3" fill={glow} opacity="0.7" />
	<circle cx="65" cy="22" r="1.5" fill={glow} opacity="0.8" />
	<circle cx="85" cy="32" r="1.2" fill={glow} opacity="0.6" />
	<circle cx="120" cy="28" r="1.6" fill={glow} opacity="0.85" />
	<circle cx="140" cy="38" r="1.1" fill={glow} opacity="0.65" />
	<circle cx="160" cy="25" r="1.4" fill={glow} opacity="0.75" />
	<circle cx="180" cy="35" r="1.3" fill={glow} opacity="0.7" />

	<!-- Extra fireflies near the hearth -->
	<circle cx="90" cy="42" r="1" fill={glow} opacity="0.8" />
	<circle cx="108" cy="40" r="1.2" fill={glow} opacity="0.9" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M0 55h200" stroke={color} stroke-width="1.5" stroke-linecap="round" opacity="0.3" />
</svg>
