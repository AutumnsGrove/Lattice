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

	// Middle row icons (the campsite in the grove)
	const shrub = [
		'M12 22v-5.172a2 2 0 0 0-.586-1.414L9.5 13.5',
		'M14.5 14.5 L12 17',
		'M17 8.8A6 6 0 0 1 13.8 20H10A6.5 6.5 0 0 1 7 8a5 5 0 0 1 10 0z'
	];

	const trees = [
		'M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z',
		'M7 16v6',
		'M13 19v3',
		'M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5'
	];

	const tentTree = [
		'm14 5 3-3 3 3',
		'm14 10 3-3 3 3',
		'M17 14V2',
		'M17 14H7l-5 8h20Z',
		'M8 14v8',
		'm9 14 5 8'
	];

	const solarPanel = [
		'M8 14h12a1 1 0 0 1 .864 1.505l-3.11 5.457A2 2 0 0 1 16 22H4a1 1 0 0 1-.863-1.506l3.108-5.456A2 2 0 0 1 8 14z',
		'M11 2h2',
		'M3 10v2',
		'M7 2a4 4 0 0 1-4 4',
		'm8.66 7.66 1.41 1.41'
	];

	// Lucide sky icons
	const moonStar = {
		paths: [
			'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
			'M20 3v4',
			'M22 5h-4'
		]
	};

	const sparkle = 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z';

	const sparkles = {
		main: 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
		lines: ['M20 3v4', 'M22 5h-4'],
		circle: { cx: 4, cy: 21, r: 2 }
	};

	const star = 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z';
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

		<!-- Frosted glass effect -->
		<filter id="frostedGlass" x="-20%" y="-20%" width="140%" height="140%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
			<feColorMatrix in="blur" type="matrix"
				values="1 0 0 0 0.05
				        0 1 0 0 0.03
				        0 0 1 0 0.02
				        0 0 0 0.85 0" />
		</filter>

		<!-- Clip path for the pill -->
		<clipPath id="pillClip">
			<rect x="12" y="41" width="40" height="14" rx="7" ry="7" />
		</clipPath>
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
		<!-- SKY - moon-star, stars, sparkles, sparkle -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Moon-star (one, prominent position) -->
		<g transform="translate(34, 6) scale(0.38)" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9">
			{#each moonStar.paths as path}
				<path d={path} />
			{/each}
		</g>

		<!-- Stars (5-pointed, scattered) -->
		<g transform="translate(6, 4) scale(0.22)" fill="#fbbf24" opacity="0.8">
			<path d={star} />
		</g>
		<g transform="translate(28, 6) scale(0.18)" fill="#f59e0b" opacity="0.7">
			<path d={star} />
		</g>
		<g transform="translate(16, 14) scale(0.16)" fill="#d97706" opacity="0.55">
			<path d={star} />
		</g>

		<!-- Sparkles (2-3, used sparingly) -->
		<g transform="translate(36, 12) scale(0.28)" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.7">
			<path d={sparkles.main} />
			{#each sparkles.lines as line}
				<path d={line} />
			{/each}
		</g>
		<g transform="translate(4, 18) scale(0.22)" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.5">
			<path d={sparkles.main} />
		</g>

		<!-- Sparkle (4-pointed, fill the gaps) -->
		<g transform="translate(22, 3) scale(0.2)" fill="#fbbf24" opacity="0.75">
			<path d={sparkle} />
		</g>
		<g transform="translate(52, 14) scale(0.18)" fill="#f59e0b" opacity="0.6">
			<path d={sparkle} />
		</g>
		<g transform="translate(10, 10) scale(0.15)" fill="#d97706" opacity="0.5">
			<path d={sparkle} />
		</g>
		<g transform="translate(46, 20) scale(0.14)" fill="#fbbf24" opacity="0.45">
			<path d={sparkle} />
		</g>

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
		<!-- MIDDLE ROW - The campsite in the grove -->
		<!-- Position: 1-Shrub, 2-Trees, 3-SolarPanel, 4-TentTree, 5-Trees -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Position 1: Shrub (left) -->
		<g transform="translate(2, 29) scale(0.42)" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
			{#each shrub as path}
				<path d={path} />
			{/each}
		</g>

		<!-- Position 2: Trees (burnt orange) -->
		<g transform="translate(12, 27) scale(0.45)" stroke="#c2410c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
			{#each trees as path}
				<path d={path} />
			{/each}
		</g>

		<!-- Position 3: Solar Panel (red) -->
		<g transform="translate(22, 29) scale(0.42)" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
			{#each solarPanel as path}
				<path d={path} />
			{/each}
		</g>

		<!-- Position 4: Tent Tree (dark green) -->
		<g transform="translate(32, 27) scale(0.45)" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
			{#each tentTree as path}
				<path d={path} />
			{/each}
		</g>

		<!-- Position 5: Trees (right) -->
		<g transform="translate(42, 29) scale(0.42)" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6">
			{#each trees as path}
				<path d={path} />
			{/each}
		</g>

		<!-- Position 6: Tree Pine (far right) -->
		<g transform="translate(52, 27) scale(0.45)" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.55">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

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

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- LANTERN GLOW - centered on Grove pill (rendered on top) -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<ellipse
			cx="32"
			cy="48"
			rx="22"
			ry="14"
			fill="url(#lanternGlow)"
			filter="url(#lanternBlur)"
		/>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- "GROVE" TEXT - frosted glass pill (rendered LAST, on top of trees) -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Solid backing to block icons showing through -->
		<rect
			x="12"
			y="41"
			width="40"
			height="14"
			rx="7"
			ry="7"
			fill="#1c1917"
		/>

		<!-- Frosted glass overlay -->
		<rect
			x="12"
			y="41"
			width="40"
			height="14"
			rx="7"
			ry="7"
			fill="#fef3c7"
			fill-opacity="0.12"
			stroke="#fbbf24"
			stroke-opacity="0.3"
			stroke-width="0.5"
		/>

		<text
			x="32"
			y="51"
			text-anchor="middle"
			font-family="Lexend, system-ui, sans-serif"
			font-size="10"
			font-weight="600"
			fill={text}
			opacity="0.95"
		>Grove</text>

	</g>
</svg>
