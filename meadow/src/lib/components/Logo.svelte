<script lang="ts">
	/**
	 * Grove Logo Component — The Tree Mark (Meadow)
	 *
	 * Re-exports the tree logo with meadow-specific defaults.
	 * This wrapper exists for backwards compatibility with meadow imports.
	 *
	 * For the full feature set, import directly from @autumnsgrove/groveengine/ui
	 */

	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { browser } from '$app/environment';

	type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'midnight';
	type BreathingSpeed = 'slow' | 'normal' | 'fast';

	// Seasonal color palettes from grove-logo-final.html
	const SEASONAL_PALETTES = {
		spring: {
			tier1: { dark: '#be185d', light: '#fecdd3' },
			tier2: { dark: '#9d174d', light: '#fda4af' },
			tier3: { dark: '#831843', light: '#fb7185' },
			trunk: { dark: '#5a3f30', light: '#6f4d39' }
		},
		summer: {
			tier1: { dark: '#15803d', light: '#86efac' },
			tier2: { dark: '#166534', light: '#4ade80' },
			tier3: { dark: '#14532d', light: '#22c55e' },
			trunk: { dark: '#3d2914', light: '#5a3f30' }
		},
		autumn: {
			tier1: { dark: '#DC2626', light: '#FCD34D' },
			tier2: { dark: '#991B1B', light: '#F59E0B' },
			tier3: { dark: '#7C2D12', light: '#EA580C' },
			trunk: { dark: '#5C3317', light: '#8B4520' }
		},
		winter: {
			tier1: { dark: '#1e3a5f', light: '#bfdbfe' },
			tier2: { dark: '#1e3a5f', light: '#93c5fd' },
			tier3: { dark: '#0f172a', light: '#60a5fa' },
			trunk: { dark: '#1e293b', light: '#334155' }
		},
		midnight: {
			tier1: { dark: '#4c1d95', light: '#fce7f3' },
			tier2: { dark: '#3b0764', light: '#f9a8d4' },
			tier3: { dark: '#1e1b4b', light: '#ec4899' },
			trunk: { dark: '#1a1a2e', light: '#2d1b4e' }
		}
	} as const;

	const BREATHING_SPEEDS = {
		slow: 1500,
		normal: 800,
		fast: 400
	} as const;

	interface Props {
		class?: string;
		season?: Season;
		breathing?: boolean;
		breathingSpeed?: BreathingSpeed;
		animate?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		season = 'summer',
		breathing = false,
		breathingSpeed = 'normal',
		animate = false
	}: Props = $props();

	// Get the palette for the current season
	const palette = $derived(SEASONAL_PALETTES[season]);

	// Reduced motion preference
	const reducedMotionQuery = browser ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	let prefersReducedMotion = $state(reducedMotionQuery?.matches ?? false);

	$effect(() => {
		if (!reducedMotionQuery) return;
		const handler = (e: MediaQueryListEvent) => { prefersReducedMotion = e.matches; };
		reducedMotionQuery.addEventListener('change', handler);
		return () => reducedMotionQuery.removeEventListener('change', handler);
	});

	// Breathing animation
	const breathValue = tweened(0, { easing: cubicInOut });

	$effect(() => {
		const duration = BREATHING_SPEEDS[breathingSpeed];
		const shouldAnimate = breathing || animate;

		if (!shouldAnimate || prefersReducedMotion) {
			breathValue.set(0, { duration: Math.min(duration / 2, 300) });
			return;
		}

		let cancelled = false;

		async function pulse() {
			while (!cancelled) {
				await breathValue.set(1, { duration });
				if (cancelled) break;
				await breathValue.set(0, { duration });
				if (cancelled) break;
			}
		}

		pulse();
		return () => { cancelled = true; };
	});

	const breathScale = $derived(1 + $breathValue * 0.05);
	const breathTransform = $derived((breathing || animate) ? `scale(${breathScale})` : '');

	// SVG paths
	const tier1DarkPath = "M50 5 L18 32 L50 18 Z";
	const tier1LightPath = "M50 5 L50 18 L82 32 Z";
	const tier2DarkPath = "M50 20 L12 50 L50 35 Z";
	const tier2LightPath = "M50 20 L50 35 L88 50 Z";
	const tier3DarkPath = "M50 38 L18 68 L50 54 Z";
	const tier3LightPath = "M50 38 L50 54 L82 68 Z";
	const trunkDarkPath = "M50 54 L42 58 L46 92 L50 92 Z";
	const trunkLightPath = "M50 54 L58 58 L54 92 L50 92 Z";
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 100"
	aria-label="Grove logo"
>
	<g
		transform="rotate(-12 50 50)"
		style={breathTransform ? `transform-origin: 50px 50px; transform: ${breathTransform};` : undefined}
	>
		<!-- Tier 1: Top branches -->
		<path fill={palette.tier1.dark} d={tier1DarkPath} />
		<path fill={palette.tier1.light} d={tier1LightPath} />

		<!-- Tier 2: Middle branches -->
		<path fill={palette.tier2.dark} d={tier2DarkPath} />
		<path fill={palette.tier2.light} d={tier2LightPath} />

		<!-- Tier 3: Bottom branches -->
		<path fill={palette.tier3.dark} d={tier3DarkPath} />
		<path fill={palette.tier3.light} d={tier3LightPath} />

		<!-- Trunk -->
		<path fill={palette.trunk.dark} d={trunkDarkPath} />
		<path fill={palette.trunk.light} d={trunkLightPath} />
	</g>
</svg>
