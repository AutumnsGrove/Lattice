<!--
  Grove — A place to Be
  Copyright (c) 2026 Autumn Brown
  Licensed under AGPL-3.0

  VineBackground — Reactive vine pattern background using the user's accent color.

  Replaces the static CSS `.leaf-pattern` class (vine-pattern.css) with a Svelte
  component that generates the 450x450 tiling SVG dynamically. The SVG string is
  rebuilt reactively when the accent color, dark mode, or opacity changes, then
  applied as a `background-image` data URI on an absolutely-positioned div.

  The accent color is read from the `--grove-accent` CSS custom property on
  `document.documentElement`. A MutationObserver watches for style attribute
  changes so the vine color updates live when the user picks a new accent.

  Usage:
    <div class="relative">
      <VineBackground />
      <main class="relative z-10">...</main>
    </div>

  Props:
    visible  - Show/hide the vine pattern (default: true)
    opacity  - Opacity multiplier 0-1, scales all element opacities (default: 1.0)
    class    - Additional CSS classes for the container div
-->
<script lang="ts">
	import { themeStore } from '$lib/ui/stores/theme.svelte';

	interface Props {
		/** Show/hide the vine pattern. Default: true */
		visible?: boolean;
		/** Opacity multiplier 0-1, scales all vine element opacities. Default: 1.0 */
		opacity?: number;
		/** Additional CSS classes for the container div */
		class?: string;
	}

	let { visible = true, opacity = 1.0, class: className = '' }: Props = $props();

	const isDark = $derived(themeStore.resolvedTheme === 'dark');

	// ── Accent color from CSS custom property ──────────────────────────
	// Falls back to Grove green (#22c55e) if the property isn't set.
	let accentColor = $state('#22c55e');

	$effect(() => {
		if (typeof document === 'undefined') return;

		// Read the current value
		function readAccent() {
			const value = getComputedStyle(document.documentElement)
				.getPropertyValue('--grove-accent')
				.trim();
			if (value) accentColor = value;
		}

		readAccent();

		// Watch for style attribute changes on <html> so we catch live accent updates
		const observer = new MutationObserver(() => {
			readAccent();
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['style', 'class']
		});

		return () => observer.disconnect();
	});

	// ── Opacity table ──────────────────────────────────────────────────
	// Light mode base opacities for each SVG element, keyed by category.
	// Dark mode adds DARK_BUMP (+0.02) for better visibility on dark backgrounds.
	const LIGHT_OPACITIES = {
		// Long flowing vines
		vine1: 0.12,
		vine2: 0.1,
		vine3: 0.09,
		vine4: 0.08,
		vine5: 0.08,
		// Spiral tendrils
		tendril1: 0.1,
		tendril2: 0.09,
		tendril3: 0.09,
		tendril4: 0.08,
		tendril5: 0.08,
		tendril6: 0.07,
		tendril7: 0.07,
		tendril8: 0.06,
		// Pointed ivy leaves
		ivyLeaf1: 0.11,
		ivyLeaf2: 0.1,
		ivyLeaf3: 0.09,
		ivyLeaf4: 0.08,
		// Round soft leaves
		roundLeaf1: 0.1,
		roundLeaf2: 0.09,
		roundLeaf3: 0.08,
		roundLeaf4: 0.08,
		roundLeaf5: 0.07,
		// Long slender leaves
		slenderLeaf1: 0.09,
		slenderLeaf2: 0.08,
		slenderLeaf3: 0.08,
		slenderLeaf4: 0.07,
		slenderLeaf5: 0.07,
		// Fern fronds
		fern1: 0.1,
		fern2: 0.09,
		fern3: 0.08,
		fern4: 0.08,
		// Floating seeds/spores
		spore1: 0.06,
		spore2: 0.05,
		spore3: 0.06,
		spore4: 0.05,
		spore5: 0.05,
		spore6: 0.04,
		spore7: 0.04
	} as const;

	const DARK_BUMP = 0.02;

	/** Compute final opacity for a given element, applying dark bump and user multiplier. */
	function op(key: keyof typeof LIGHT_OPACITIES): number {
		const base = LIGHT_OPACITIES[key] + (isDark ? DARK_BUMP : 0);
		return Math.min(1, base * opacity);
	}

	/** URL-encode a hex color for use inside a data URI (# → %23). */
	function encodeColor(hex: string): string {
		return hex.replace('#', '%23');
	}

	// ── SVG generation ─────────────────────────────────────────────────
	// Rebuilt reactively when accentColor, isDark, or opacity changes.
	// The SVG paths are identical to vine-pattern.css — do not modify them.
	const backgroundImage = $derived.by(() => {
		if (!visible) return 'none';

		const c = encodeColor(accentColor);

		const svg =
			`%3Csvg width='450' height='450' viewBox='0 0 450 450' xmlns='http://www.w3.org/2000/svg'%3E` +
			// ── Stroked elements (vines + tendrils) ──
			`%3Cg fill='none' stroke='${c}' stroke-linecap='round'%3E` +
			// Long flowing vine 1 — dramatic S-curve
			`%3Cpath d='M-30 420 C50 380 30 320 80 260 S150 180 120 120 S180 40 140 -30' stroke-width='1.5' opacity='${op('vine1')}'/%3E` +
			// Long flowing vine 2 — opposite sweep
			`%3Cpath d='M480 380 C400 350 420 280 360 230 S280 160 310 100 S250 30 290 -20' stroke-width='1.4' opacity='${op('vine2')}'/%3E` +
			// Diagonal vine crossing
			`%3Cpath d='M-20 280 C60 250 100 220 160 200 S250 160 320 170 S400 130 470 100' stroke-width='1.2' opacity='${op('vine3')}'/%3E` +
			// Vertical accent vine
			`%3Cpath d='M200 480 C180 420 210 360 190 300 S220 220 200 160 S230 80 210 20' stroke-width='1.1' opacity='${op('vine4')}'/%3E` +
			// Wandering vine
			`%3Cpath d='M350 480 C330 430 360 380 340 320 S380 260 350 200' stroke-width='1' opacity='${op('vine5')}'/%3E` +
			// Spiral tendrils scattered
			`%3Cpath d='M80 260 Q100 250 108 238 Q115 225 105 215 Q95 208 85 215' stroke-width='0.8' opacity='${op('tendril1')}'/%3E` +
			`%3Cpath d='M120 120 Q140 130 150 120 Q158 108 145 98 Q132 92 125 102' stroke-width='0.7' opacity='${op('tendril2')}'/%3E` +
			`%3Cpath d='M360 230 Q340 222 330 232 Q322 245 335 255 Q348 262 358 250' stroke-width='0.7' opacity='${op('tendril3')}'/%3E` +
			`%3Cpath d='M310 100 Q290 92 280 102 Q272 115 288 125' stroke-width='0.6' opacity='${op('tendril4')}'/%3E` +
			`%3Cpath d='M160 200 Q180 192 188 202 Q195 215 182 225' stroke-width='0.6' opacity='${op('tendril5')}'/%3E` +
			`%3Cpath d='M190 300 Q210 292 218 305 Q224 320 210 328' stroke-width='0.6' opacity='${op('tendril6')}'/%3E` +
			`%3Cpath d='M340 320 Q360 328 365 342 Q368 358 352 362' stroke-width='0.6' opacity='${op('tendril7')}'/%3E` +
			`%3Cpath d='M55 380 Q75 372 82 385 Q88 400 72 408' stroke-width='0.5' opacity='${op('tendril8')}'/%3E` +
			`%3C/g%3E` +
			// ── Filled elements (leaves, ferns, spores) ──
			`%3Cg fill='${c}'%3E` +
			// Pointed ivy leaves
			`%3Cpath d='M70 300 Q85 280 78 265 Q70 280 55 288 Q70 295 70 300Z' opacity='${op('ivyLeaf1')}'/%3E` +
			`%3Cpath d='M135 145 Q150 128 143 115 Q135 128 120 135 Q135 142 135 145Z' opacity='${op('ivyLeaf2')}'/%3E` +
			`%3Cpath d='M375 255 Q360 240 365 225 Q375 240 390 245 Q375 252 375 255Z' opacity='${op('ivyLeaf3')}'/%3E` +
			`%3Cpath d='M220 180 Q235 165 228 152 Q220 165 205 172 Q220 178 220 180Z' opacity='${op('ivyLeaf4')}'/%3E` +
			// Round soft leaves
			`%3Cellipse cx='95' cy='210' rx='9' ry='14' transform='rotate(-35 95 210)' opacity='${op('roundLeaf1')}'/%3E` +
			`%3Cellipse cx='335' cy='145' rx='8' ry='12' transform='rotate(28 335 145)' opacity='${op('roundLeaf2')}'/%3E` +
			`%3Cellipse cx='175' cy='255' rx='7' ry='11' transform='rotate(-18 175 255)' opacity='${op('roundLeaf3')}'/%3E` +
			`%3Cellipse cx='280' cy='195' rx='6' ry='10' transform='rotate(40 280 195)' opacity='${op('roundLeaf4')}'/%3E` +
			`%3Cellipse cx='405' cy='120' rx='7' ry='10' transform='rotate(-25 405 120)' opacity='${op('roundLeaf5')}'/%3E` +
			// Long slender leaves
			`%3Cpath d='M145 175 Q152 155 145 135 Q138 155 145 175Z' opacity='${op('slenderLeaf1')}'/%3E` +
			`%3Cpath d='M295 130 Q305 115 298 98 Q288 115 295 130Z' opacity='${op('slenderLeaf2')}'/%3E` +
			`%3Cpath d='M210 275 Q200 258 205 240 Q218 258 210 275Z' opacity='${op('slenderLeaf3')}'/%3E` +
			`%3Cpath d='M365 195 Q375 180 368 162 Q358 180 365 195Z' opacity='${op('slenderLeaf4')}'/%3E` +
			`%3Cpath d='M115 365 Q125 348 118 330 Q108 348 115 365Z' opacity='${op('slenderLeaf5')}'/%3E` +
			// Fern fronds — each frond has a stem stroke + leaf ellipses
			`%3Cg transform='translate(45 365) rotate(-45)' opacity='${op('fern1')}'%3E` +
			`%3Cpath d='M0,0 L0,-30' stroke='${c}' stroke-width='0.6' fill='none'/%3E` +
			`%3Cellipse cx='-5' cy='-7' rx='3.5' ry='6' transform='rotate(-30 -5 -7)'/%3E` +
			`%3Cellipse cx='5' cy='-12' rx='3.5' ry='6' transform='rotate(30 5 -12)'/%3E` +
			`%3Cellipse cx='-4' cy='-17' rx='3' ry='5' transform='rotate(-30 -4 -17)'/%3E` +
			`%3Cellipse cx='4' cy='-22' rx='3' ry='5' transform='rotate(30 4 -22)'/%3E` +
			`%3Cellipse cx='0' cy='-28' rx='2.5' ry='4'/%3E` +
			`%3C/g%3E` +
			`%3Cg transform='translate(390 185) rotate(40)' opacity='${op('fern2')}'%3E` +
			`%3Cpath d='M0,0 L0,-28' stroke='${c}' stroke-width='0.6' fill='none'/%3E` +
			`%3Cellipse cx='-4' cy='-6' rx='3' ry='5' transform='rotate(-25 -4 -6)'/%3E` +
			`%3Cellipse cx='4' cy='-11' rx='3' ry='5' transform='rotate(25 4 -11)'/%3E` +
			`%3Cellipse cx='-3' cy='-16' rx='2.5' ry='4' transform='rotate(-25 -3 -16)'/%3E` +
			`%3Cellipse cx='3' cy='-21' rx='2.5' ry='4' transform='rotate(25 3 -21)'/%3E` +
			`%3Cellipse cx='0' cy='-26' rx='2' ry='3'/%3E` +
			`%3C/g%3E` +
			`%3Cg transform='translate(255 65) rotate(-25)' opacity='${op('fern3')}'%3E` +
			`%3Cpath d='M0,0 L0,-25' stroke='${c}' stroke-width='0.5' fill='none'/%3E` +
			`%3Cellipse cx='-4' cy='-6' rx='2.5' ry='4' transform='rotate(-30 -4 -6)'/%3E` +
			`%3Cellipse cx='4' cy='-10' rx='2.5' ry='4' transform='rotate(30 4 -10)'/%3E` +
			`%3Cellipse cx='-3' cy='-15' rx='2' ry='3.5' transform='rotate(-30 -3 -15)'/%3E` +
			`%3Cellipse cx='3' cy='-20' rx='2' ry='3' transform='rotate(30 3 -20)'/%3E` +
			`%3C/g%3E` +
			`%3Cg transform='translate(140 420) rotate(55)' opacity='${op('fern4')}'%3E` +
			`%3Cpath d='M0,0 L0,-22' stroke='${c}' stroke-width='0.5' fill='none'/%3E` +
			`%3Cellipse cx='-3' cy='-5' rx='2' ry='3.5' transform='rotate(-25 -3 -5)'/%3E` +
			`%3Cellipse cx='3' cy='-9' rx='2' ry='3.5' transform='rotate(25 3 -9)'/%3E` +
			`%3Cellipse cx='-2' cy='-14' rx='1.5' ry='3' transform='rotate(-25 -2 -14)'/%3E` +
			`%3Cellipse cx='2' cy='-18' rx='1.5' ry='2.5' transform='rotate(25 2 -18)'/%3E` +
			`%3C/g%3E` +
			// Tiny floating seeds/spores
			`%3Ccircle cx='180' cy='90' r='2' opacity='${op('spore1')}'/%3E` +
			`%3Ccircle cx='85' cy='175' r='1.5' opacity='${op('spore2')}'/%3E` +
			`%3Ccircle cx='345' cy='290' r='2' opacity='${op('spore3')}'/%3E` +
			`%3Ccircle cx='420' cy='200' r='1.5' opacity='${op('spore4')}'/%3E` +
			`%3Ccircle cx='260' cy='350' r='2' opacity='${op('spore5')}'/%3E` +
			`%3Ccircle cx='40' cy='120' r='1.5' opacity='${op('spore6')}'/%3E` +
			`%3Ccircle cx='310' cy='400' r='1.5' opacity='${op('spore7')}'/%3E` +
			`%3C/g%3E%3C/svg%3E`;

		return `url("data:image/svg+xml,${svg}")`;
	});
</script>

{#if visible}
	<div
		class="pointer-events-none absolute inset-0 z-0 {className}"
		aria-hidden="true"
		style:background-image={backgroundImage}
	></div>
{/if}
