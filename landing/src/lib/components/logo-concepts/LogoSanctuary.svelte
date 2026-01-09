<!--
  Grove Logo: Sanctuary
  A grove of line-art trees within a circular badge, with a glowing flame at center
  Evokes: "A warm sanctuary in the night forest—someone left a light on for you"
-->
<script lang="ts">
	/**
	 * Grove Logo: Sanctuary
	 * Night grove with various stylized trees and a central glowing flame
	 * The vibe: warmth, safety, community gathering in the dark
	 *
	 * Typography: Uses Calistoga for the wordmark—intentionally distinct from
	 * body text (Lexend). Calistoga's warm, rounded character matches the
	 * sanctuary theme. This is a deliberate design choice; keep it unique.
	 */
	interface Props {
		/** CSS classes for sizing and positioning */
		class?: string;
		/** Line/stroke color (defaults to warm gold) */
		lineColor?: string;
		/** Flame/glow color (defaults to warm amber) */
		flameColor?: string;
		/** Background color inside the circle (defaults to transparent) */
		backgroundColor?: string;
		/** Show the "Grove" text below the emblem */
		showText?: boolean;
		/** Show the crescent moon */
		showMoon?: boolean;
		/** Show decorative stars */
		showStars?: boolean;
		/** Show the flame glow effect */
		showGlow?: boolean;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className = 'w-16 h-16',
		lineColor = '#d4a574',
		flameColor = '#f59e0b',
		backgroundColor = 'transparent',
		showText = true,
		showMoon = true,
		showStars = true,
		showGlow = true,
		title = 'Grove'
	}: Props = $props();

	// Generate unique IDs for gradients to avoid conflicts with multiple instances
	const uniqueId = Math.random().toString(36).substring(2, 9);
	const glowGradientId = `sanctuary-glow-${uniqueId}`;
	const flameGradientId = `sanctuary-flame-${uniqueId}`;
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 {showText ? 115 : 100}"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<defs>
		<!-- Radial glow for the flame -->
		<radialGradient id={glowGradientId} cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color={flameColor} stop-opacity="0.8" />
			<stop offset="50%" stop-color={flameColor} stop-opacity="0.3" />
			<stop offset="100%" stop-color={flameColor} stop-opacity="0" />
		</radialGradient>
		<!-- Flame body gradient -->
		<linearGradient id={flameGradientId} x1="0%" y1="100%" x2="0%" y2="0%">
			<stop offset="0%" stop-color="#ea580c" />
			<stop offset="50%" stop-color={flameColor} />
			<stop offset="100%" stop-color="#fef08a" />
		</linearGradient>
	</defs>

	<!-- Background circle (if backgroundColor is set) -->
	{#if backgroundColor !== 'transparent'}
		<circle cx="50" cy="50" r="46" fill={backgroundColor} />
	{/if}

	<!-- Outer ring -->
	<circle
		cx="50"
		cy="50"
		r="46"
		stroke={lineColor}
		stroke-width="2"
		fill="none"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- CELESTIAL ELEMENTS -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showMoon}
		<!-- Crescent moon (upper right) -->
		<path
			d="M72 22
			   a 6 6 0 1 1 0 12
			   a 4.5 4.5 0 1 0 0 -12"
			stroke={lineColor}
			stroke-width="1.5"
			fill="none"
		/>
	{/if}

	{#if showStars}
		<!-- Four-pointed stars scattered in the sky -->
		<!-- Star 1 (upper left) -->
		<path d="M22 18 l0 -3 l0 6 m-3 -3 l6 0" stroke={lineColor} stroke-width="1" stroke-linecap="round" />
		<!-- Star 2 (small, left of moon) -->
		<path d="M62 15 l0 -2 l0 4 m-2 -2 l4 0" stroke={lineColor} stroke-width="0.8" stroke-linecap="round" />
		<!-- Star 3 (right side) -->
		<path d="M82 35 l0 -2.5 l0 5 m-2.5 -2.5 l5 0" stroke={lineColor} stroke-width="0.8" stroke-linecap="round" />
		<!-- Star 4 (lower left, smaller) -->
		<path d="M15 32 l0 -2 l0 4 m-2 -2 l4 0" stroke={lineColor} stroke-width="0.7" stroke-linecap="round" />
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES (left to right) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Tree 1: Round deciduous (far left) -->
	<g stroke={lineColor} stroke-width="1.5" stroke-linecap="round" fill="none">
		<!-- Round canopy outline -->
		<ellipse cx="20" cy="52" rx="9" ry="12" />
		<!-- Trunk -->
		<path d="M20 64 L20 75" />
		<!-- Internal branch structure -->
		<path d="M20 64 L20 48" />
		<path d="M20 55 L15 48" />
		<path d="M20 55 L25 48" />
		<path d="M20 50 L17 44" />
		<path d="M20 50 L23 44" />
	</g>

	<!-- Tree 2: Tall thin cypress (left-center) -->
	<g stroke={lineColor} stroke-width="1.5" stroke-linecap="round" fill="none">
		<!-- Narrow pointed canopy -->
		<path d="M32 75 L32 38 Q32 32, 34 28 Q35 36, 35 42 L35 75" />
		<!-- Internal veins -->
		<path d="M33.5 45 L33.5 35" />
		<path d="M33 50 L31 42" />
		<path d="M34 50 L36 42" />
	</g>

	<!-- Tree 3: Small bush/young tree (front left) -->
	<g stroke={lineColor} stroke-width="1.3" stroke-linecap="round" fill="none">
		<ellipse cx="40" cy="68" rx="5" ry="7" />
		<path d="M40 75 L40 79" stroke-width="1.5" />
		<path d="M40 75 L40 65" />
		<path d="M40 70 L37 65" />
		<path d="M40 70 L43 65" />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- CENTER: Gothic arch tree with flame (the hero element) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showGlow}
		<!-- Soft glow behind the flame -->
		<circle cx="50" cy="68" r="12" fill="url(#{glowGradientId})" />
	{/if}

	<g stroke={lineColor} stroke-width="1.8" stroke-linecap="round" fill="none">
		<!-- Gothic arch shape (pointed arch like a cathedral window) -->
		<path d="M42 80 L42 55 Q42 42, 50 38 Q58 42, 58 55 L58 80" />
		<!-- Trunk connecting to ground -->
		<path d="M50 80 L50 85" stroke-width="2" />
		<!-- Internal arch details -->
		<path d="M45 75 L45 58 Q45 48, 50 44 Q55 48, 55 58 L55 75" stroke-width="1.2" />
	</g>

	<!-- The flame itself -->
	<path
		d="M50 73
		   Q47 68, 48 64
		   Q46 60, 50 54
		   Q54 60, 52 64
		   Q53 68, 50 73
		   Z"
		fill="url(#{flameGradientId})"
		stroke={flameColor}
		stroke-width="0.5"
	/>
	<!-- Flame inner glow -->
	<ellipse cx="50" cy="66" rx="2" ry="4" fill="#fef3c7" opacity="0.8" />

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MORE TREES (right side) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Tree 4: Small shrub (front right) -->
	<g stroke={lineColor} stroke-width="1.3" stroke-linecap="round" fill="none">
		<ellipse cx="60" cy="70" rx="4" ry="5" />
		<path d="M60 75 L60 79" stroke-width="1.5" />
		<path d="M60 75 L60 68" />
		<path d="M60 72 L58 68" />
		<path d="M60 72 L62 68" />
	</g>

	<!-- Tree 5: Tall striped tree (birch-like, right-center) -->
	<g stroke={lineColor} stroke-width="1.5" stroke-linecap="round" fill="none">
		<!-- Pointed oval canopy -->
		<path d="M68 75 Q64 65, 68 42 Q72 32, 72 42 Q76 65, 72 75" />
		<!-- Horizontal branch lines -->
		<path d="M66 55 L74 55" stroke-width="1" />
		<path d="M67 62 L73 62" stroke-width="1" />
		<path d="M67 48 L73 48" stroke-width="1" />
		<!-- Trunk -->
		<path d="M70 75 L70 80" stroke-width="1.8" />
	</g>

	<!-- Tree 6: Round deciduous (far right) -->
	<g stroke={lineColor} stroke-width="1.5" stroke-linecap="round" fill="none">
		<!-- Round canopy -->
		<ellipse cx="82" cy="56" rx="7" ry="10" />
		<!-- Trunk -->
		<path d="M82 66 L82 75" />
		<!-- Internal branches -->
		<path d="M82 66 L82 52" />
		<path d="M82 58 L78 52" />
		<path d="M82 58 L86 52" />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<path
		d="M12 80 L88 80"
		stroke={lineColor}
		stroke-width="1.5"
		stroke-linecap="round"
	/>
	<!-- Secondary ground line for depth -->
	<path
		d="M8 84 L92 84"
		stroke={lineColor}
		stroke-width="1"
		stroke-linecap="round"
		opacity="0.5"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- "GROVE" TEXT -->
	<!-- NOTE: Calistoga is intentionally used here for its unique, warm character. -->
	<!-- This is the logo wordmark—keep it distinct from body text (Lexend). -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showText}
		<text
			x="50"
			y="108"
			text-anchor="middle"
			font-family="Calistoga, serif"
			font-size="16"
			fill={lineColor}
			letter-spacing="1"
		>
			Grove
		</text>
	{/if}
</svg>
