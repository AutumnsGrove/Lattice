<!--
  Grove Logo: The Circle
  A tight circular composition with trees and wordmark
  Glass-styled, round format
  Evokes: "A complete world. The grove, whole."
-->
<script lang="ts">
	/**
	 * Grove Logo: The Circle
	 * Compact circular composition with trees + wordmark
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
			trees: '#16a34a',
			accent: '#22c55e',
			text: '#166534',
			glow: '#fde047'
		},
		autumn: {
			trees: '#d97706',
			accent: '#ea580c',
			text: '#92400e',
			glow: '#fbbf24'
		},
		winter: {
			trees: '#64748b',
			accent: '#94a3b8',
			text: '#475569',
			glow: '#e0f2fe'
		},
		night: {
			trees: '#16a34a',
			accent: '#4ade80',
			text: '#bbf7d0',
			glow: '#fde047'
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
		<linearGradient id="circleGlass-{variant}" x1="0%" y1="0%" x2="100%" y2="100%">
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
		<!-- Clip path for circular bounds -->
		<clipPath id="circleClip-{variant}">
			<circle cx="50" cy="50" r="46" />
		</clipPath>
	</defs>

	<!-- Circle glass container -->
	<circle
		cx="50"
		cy="50"
		r="47"
		fill="url(#circleGlass-{variant})"
		stroke={treeColor}
		stroke-width="1.5"
		stroke-opacity="0.3"
	/>

	<!-- Inner highlight for glass effect -->
	<ellipse
		cx="50"
		cy="35"
		rx="35"
		ry="20"
		fill="white"
		fill-opacity="0.12"
	/>

	<!-- Content clipped to circle -->
	<g clip-path="url(#circleClip-{variant})">

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- TREES - Tight cluster of 4 (fits circle better) -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<!-- Background tree (left) -->
		<g transform="translate(15, 22) scale(0.55)" stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- Background tree (right) -->
		<g transform="translate(60, 24) scale(0.5)" stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.45">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Hero tree left -->
		<g transform="translate(25, 12) scale(0.75)" stroke={treeColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
			<path d={treeDeciduous.canopy} />
			<path d={treeDeciduous.trunk} />
		</g>

		<!-- Hero tree center-right (main) -->
		<g transform="translate(42, 6) scale(0.85)" stroke={treeColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="1">
			<path d={treePine.canopy} />
			<path d={treePine.trunk} />
		</g>

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- FIREFLIES -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		{#if variant === 'night'}
			<circle cx="35" cy="35" r="2" fill={glow} opacity="0.9" />
			<circle cx="68" cy="38" r="1.5" fill={glow} opacity="0.7" />
			<circle cx="52" cy="28" r="1.2" fill={glow} opacity="0.8" />
		{:else}
			<circle cx="38" cy="38" r="1.5" fill={glow} opacity="0.5" />
			<circle cx="65" cy="42" r="1.2" fill={glow} opacity="0.4" />
		{/if}

		<!-- ═══════════════════════════════════════════════════════════════ -->
		<!-- CURVED GROUND (follows circle) -->
		<!-- ═══════════════════════════════════════════════════════════════ -->

		<path d="M10 58 Q50 62 90 58" stroke={treeColor} stroke-width="1.5" stroke-linecap="round" opacity="0.2" fill="none" />

	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- WORDMARK - "Grove" on curved path -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showText}
		<defs>
			<path id="textArc-{variant}" d="M 15 75 Q 50 90 85 75" fill="none" />
		</defs>
		<text
			font-family="Calistoga, Georgia, serif"
			font-size="18"
			font-weight="400"
			fill={text}
			letter-spacing="3"
		>
			<textPath href="#textArc-{variant}" startOffset="50%" text-anchor="middle">
				Grove
			</textPath>
		</text>
	{/if}
</svg>
