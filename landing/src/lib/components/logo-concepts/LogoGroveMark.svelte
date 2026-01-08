<!--
  Grove Logo: The Grove Mark
  A window into the grove - trees leaning together around a warm glow
  Seasonal layers: Summer greens → Autumn reds/oranges → Spring pinks/greens
  Evokes: "There's a light on. Come home."
-->
<script lang="ts">
	/**
	 * Grove Logo: The Grove Mark
	 * Circular composition with trees and centered wordmark
	 */
	interface Props {
		class?: string;
		color?: string;
		textColor?: string;
		title?: string;
	}

	let {
		class: className = 'w-16 h-16',
		color,
		textColor,
		title
	}: Props = $props();

	const treeColor = $derived(color ?? '#b45309');
	const text = $derived(textColor ?? '#fef3c7');

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
		<!-- Circular clip path -->
		<clipPath id="groveMarkCircle">
			<circle cx="32" cy="32" r="30" />
		</clipPath>

		<!-- Autumn night sky gradient -->
		<linearGradient id="groveMarkBg" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color="#292524" />
			<stop offset="50%" stop-color="#1c1917" />
			<stop offset="100%" stop-color="#0c0a09" />
		</linearGradient>

		<!-- Warm autumn gradient (red-orange) -->
		<linearGradient id="groveMarkWarm" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#dc2626" />
			<stop offset="100%" stop-color="#ea580c" />
		</linearGradient>

		<!-- Deep autumn gradient (amber-rust) -->
		<linearGradient id="groveMarkCool" x1="0%" y1="0%" x2="0%" y2="100%">
			<stop offset="0%" stop-color="#b45309" />
			<stop offset="100%" stop-color="#78350f" />
		</linearGradient>

		<!-- Sparkle glow -->
		<filter id="groveMarkGlow">
			<feGaussianBlur stdDeviation="0.6" result="blur" />
			<feMerge>
				<feMergeNode in="blur" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>

		<!-- Lantern glow - warm light from within -->
		<radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color="#fbbf24" stop-opacity="0.35" />
			<stop offset="40%" stop-color="#f59e0b" stop-opacity="0.2" />
			<stop offset="70%" stop-color="#d97706" stop-opacity="0.1" />
			<stop offset="100%" stop-color="#92400e" stop-opacity="0" />
		</radialGradient>

		<!-- Soft warmth filter for the glow -->
		<filter id="lanternBlur">
			<feGaussianBlur stdDeviation="3" />
		</filter>
	</defs>

	<!-- Circle border/ring -->
	<circle cx="32" cy="32" r="31" stroke="#d97706" stroke-width="1" stroke-opacity="0.3" fill="none" />

	<!-- Clipped content -->
	<g clip-path="url(#groveMarkCircle)">
		<!-- Night background -->
		<rect width="64" height="64" fill="url(#groveMarkBg)" />

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- THE LANTERN - hanging above, lighting the way -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<g transform="translate(19.2, 8) scale(0.32)">
			<!-- Lantern top hook -->
			<path
				d="M16 2v3M13 5h6"
				stroke="#d97706"
				stroke-width="2"
				stroke-linecap="round"
			/>

			<!-- Lantern frame - glass chamber -->
			<path
				d="M10 8c0-1 1-2 2-2h8c1 0 2 1 2 2v10c0 1-1 2-2 2h-8c-1 0-2-1-2-2V8z"
				stroke="#d97706"
				stroke-width="2"
				fill="none"
			/>

			<!-- The flame/light inside -->
			<ellipse
				cx="16"
				cy="13"
				rx="3"
				ry="4"
				fill="#fbbf24"
			/>

			<!-- Lantern base -->
			<path
				d="M11 20h10M13 20v4c0 1 1 2 3 2s3-1 3-2v-4"
				stroke="#d97706"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</g>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- SPARKLES (in the sky area) - all autumn gold/amber -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<circle cx="12" cy="10" r="1.8" fill="#fbbf24" opacity="0.9" filter="url(#groveMarkGlow)" />
		<circle cx="24" cy="6" r="1.2" fill="#f59e0b" opacity="0.7" />
		<circle cx="52" cy="8" r="1.5" fill="#fbbf24" opacity="0.85" filter="url(#groveMarkGlow)" />
		<circle cx="40" cy="12" r="1" fill="#d97706" opacity="0.6" />
		<circle cx="8" cy="20" r="0.8" fill="#fbbf24" opacity="0.5" />
		<circle cx="56" cy="18" r="0.9" fill="#f59e0b" opacity="0.55" />

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- MAIN TREES (ROW 1) - SUMMER greens -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Far left (grove green, small) - leaning in -->
		<g transform="translate(4, 22) scale(0.5) rotate(5, 12, 19)" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.45">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- Far right (light green, small) - leaning in -->
		<g transform="translate(48, 20) scale(0.52) rotate(-5, 12, 19)" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.42">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Left tree (light green) - leaning in -->
		<g transform="translate(10, 14) scale(0.68) rotate(4, 12, 19)" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Right tree (grove green) - leaning in -->
		<g transform="translate(38, 16) scale(0.62) rotate(-4, 12, 19)" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.75">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- Center hero tree (grove green) - standing tall -->
		<g transform="translate(22, 8) scale(0.82)" stroke="#15803d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- LANTERN GLOW - the warm light that says "come home" -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<ellipse
			cx="32"
			cy="37"
			rx="22"
			ry="16"
			fill="url(#lanternGlow)"
			filter="url(#lanternBlur)"
		/>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- "GROVE" TEXT - centered in warm glass pill -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Glass pill background - warmer tint -->
		<rect
			x="12"
			y="30"
			width="40"
			height="14"
			rx="7"
			ry="7"
			fill="#fef3c7"
			fill-opacity="0.15"
			stroke="#fbbf24"
			stroke-opacity="0.25"
			stroke-width="0.5"
		/>

		<text
			x="32"
			y="40"
			text-anchor="middle"
			font-family="Lexend, system-ui, sans-serif"
			font-size="10"
			font-weight="600"
			fill={text}
			opacity="0.95"
		>Grove</text>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- FOREGROUND TREES (ROW 2) - AUTUMN oranges/ambers -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Foreground 1 (deep red) - leaning in -->
		<g transform="translate(6, 39) scale(0.44) rotate(4, 12, 19)" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.52">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- Foreground 2 (orange) - leaning in -->
		<g transform="translate(16, 40) scale(0.42) rotate(2, 12, 19)" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Foreground 3 (deep red) - center -->
		<g transform="translate(26, 39) scale(0.44)" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.52">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- Foreground 4 (orange) - leaning in -->
		<g transform="translate(36, 40) scale(0.42) rotate(-2, 12, 19)" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Foreground 5 (deep red) - leaning in -->
		<g transform="translate(46, 39) scale(0.44) rotate(-4, 12, 19)" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.52">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- BOTTOM TREES (ROW 3) - SPRING pinks and light greens -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Bottom 1 (pink) - leaning in -->
		<g transform="translate(12, 48) scale(0.34) rotate(3, 12, 19)" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.48">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Bottom 2 (rose) - leaning in -->
		<g transform="translate(22, 49) scale(0.32) rotate(1, 12, 19)" stroke="#f472b6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.45">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- Bottom 3 (light green - spring) - center -->
		<g transform="translate(30, 48) scale(0.34)" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.48">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Bottom 4 (mint) - leaning in -->
		<g transform="translate(38, 49) scale(0.32) rotate(-1, 12, 19)" stroke="#86efac" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.45">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- Bottom 5 (pink) - leaning in -->
		<g transform="translate(46, 48) scale(0.34) rotate(-3, 12, 19)" stroke="#f9a8d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.48">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

	</g>
</svg>
