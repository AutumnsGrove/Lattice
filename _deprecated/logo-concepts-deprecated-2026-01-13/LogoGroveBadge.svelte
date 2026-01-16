<!--
  Grove Logo: The Badge
  A tight, compact composition with trees and wordmark
  Glass-styled, square format, autumn-inspired
  Evokes: "The official Grove mark. Warm, tight, home."
-->
<script lang="ts">
	/**
	 * Grove Logo: The Badge
	 * Compact square composition with trees + wordmark
	 */
	interface Props {
		class?: string;
		color?: string;
		accentColor?: string;
		textColor?: string;
		variant?: 'default' | 'autumn' | 'winter' | 'night';
		showText?: boolean;
		title?: string;
	}

	let {
		class: className = 'w-32 h-32',
		color,
		accentColor,
		textColor,
		variant = 'default',
		showText = true,
		title
	}: Props = $props();

	// Color schemes by variant
	const schemes = {
		default: {
			trees: '#16a34a',    // grove green
			accent: '#22c55e',   // meadow
			text: '#166534',     // deep green
			glow: '#fde047'      // firefly yellow
		},
		autumn: {
			trees: '#d97706',    // amber
			accent: '#ea580c',   // pumpkin
			text: '#92400e',     // rust
			glow: '#fbbf24'      // warm gold
		},
		winter: {
			trees: '#64748b',    // slate
			accent: '#94a3b8',   // light slate
			text: '#475569',     // darker slate
			glow: '#e0f2fe'      // ice blue
		},
		night: {
			trees: '#16a34a',    // grove green
			accent: '#4ade80',   // spring green
			text: '#bbf7d0',     // pale green
			glow: '#fde047'      // firefly
		}
	};

	const scheme = $derived(schemes[variant]);
	const treeColor = $derived(color ?? scheme.trees);
	const accent = $derived(accentColor ?? scheme.accent);
	const text = $derived(textColor ?? scheme.text);
	const glow = $derived(scheme.glow);

	// Lucide icon paths
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
	viewBox="0 0 100 100"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<!-- Glass background -->
	<defs>
		<linearGradient id="glassGradient-{variant}" x1="0%" y1="0%" x2="100%" y2="100%">
			{#if variant === 'night'}
				<stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.9" />
				<stop offset="100%" stop-color="#312e81" stop-opacity="0.8" />
			{:else if variant === 'autumn'}
				<stop offset="0%" stop-color="#fffbeb" stop-opacity="0.85" />
				<stop offset="100%" stop-color="#fef3c7" stop-opacity="0.75" />
			{:else if variant === 'winter'}
				<stop offset="0%" stop-color="#f8fafc" stop-opacity="0.9" />
				<stop offset="100%" stop-color="#e2e8f0" stop-opacity="0.8" />
			{:else}
				<stop offset="0%" stop-color="#f0fdf4" stop-opacity="0.85" />
				<stop offset="100%" stop-color="#dcfce7" stop-opacity="0.75" />
			{/if}
		</linearGradient>
		<filter id="glassBlur-{variant}" x="-20%" y="-20%" width="140%" height="140%">
			<feGaussianBlur in="SourceGraphic" stdDeviation="1" />
		</filter>
	</defs>

	<!-- Rounded square glass container -->
	<rect
		x="2"
		y="2"
		width="96"
		height="96"
		rx="16"
		ry="16"
		fill="url(#glassGradient-{variant})"
		stroke={treeColor}
		stroke-width="1.5"
		stroke-opacity="0.3"
	/>

	<!-- Inner glow/highlight for glass effect -->
	<rect
		x="4"
		y="4"
		width="92"
		height="46"
		rx="14"
		ry="14"
		fill="white"
		fill-opacity="0.15"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES - Tight cluster of 5 -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Background tree (smallest, left) -->
	<g transform="translate(12, 28) scale(0.5)" stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Background tree (smallest, right) -->
	<g transform="translate(62, 30) scale(0.45)" stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.45">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Mid tree (left of center) -->
	<g transform="translate(22, 18) scale(0.7)" stroke={treeColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.75">
		<path d={treeDeciduous.canopy} />
		<path d={treeDeciduous.trunk} />
	</g>

	<!-- Mid tree (right of center) -->
	<g transform="translate(52, 20) scale(0.65)" stroke={treeColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- Hero tree (center, largest) -->
	<g transform="translate(35, 8) scale(0.9)" stroke={treeColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="1">
		<path d={treePine.canopy} />
		<path d={treePine.trunk} />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- FIREFLIES (subtle magic) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if variant === 'night'}
		<circle cx="28" cy="35" r="2" fill={glow} opacity="0.9" />
		<circle cx="72" cy="40" r="1.5" fill={glow} opacity="0.7" />
		<circle cx="50" cy="32" r="1.2" fill={glow} opacity="0.8" />
	{:else}
		<circle cx="30" cy="38" r="1.5" fill={glow} opacity="0.6" />
		<circle cx="70" cy="42" r="1.2" fill={glow} opacity="0.5" />
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path d="M15 62h70" stroke={treeColor} stroke-width="1.5" stroke-linecap="round" opacity="0.25" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- WORDMARK - "Grove" -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showText}
		<!-- Using Calistoga-style hand-lettered feel via SVG text -->
		<text
			x="50"
			y="82"
			text-anchor="middle"
			font-family="Calistoga, Georgia, serif"
			font-size="22"
			font-weight="400"
			fill={text}
			letter-spacing="1"
		>
			Grove
		</text>
	{/if}
</svg>
