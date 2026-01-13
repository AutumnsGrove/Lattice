<script lang="ts">
	/**
	 * Grove Logo Component — The Tree Mark
	 *
	 * A beautifully crafted tree logo with seasonal color palettes,
	 * 3D depth through light/dark branch splits, and extensive customization.
	 *
	 * The logo features three tiers of branches with a gentle -12° rotation
	 * that gives it an organic, windswept feel.
	 *
	 * ## Seasons
	 * - `spring` — Rose Gold (cherry blossoms)
	 * - `summer` — Sunlit (lush green) [default]
	 * - `autumn` — Sunset (warm red/gold)
	 * - `winter` — Ice (cool blue)
	 * - `midnight` — Rose Bloom (purple/pink, the queer fifth season 🌙)
	 *
	 * @example Basic usage
	 * ```svelte
	 * <Logo />
	 * <Logo season="autumn" />
	 * <Logo season="midnight" size="lg" />
	 * ```
	 *
	 * @example Size variants
	 * ```svelte
	 * <Logo size="xs" />  <!-- 16px -->
	 * <Logo size="sm" />  <!-- 24px -->
	 * <Logo size="md" />  <!-- 32px -->
	 * <Logo size="lg" />  <!-- 48px -->
	 * <Logo size="xl" />  <!-- 64px -->
	 * <Logo size="2xl" /> <!-- 80px -->
	 * <Logo size="3xl" /> <!-- 120px -->
	 * <Logo size={100} /> <!-- 100px custom -->
	 * ```
	 *
	 * @example Custom rotation and colors
	 * ```svelte
	 * <Logo rotation={0} />  <!-- No tilt -->
	 * <Logo rotation={-20} />  <!-- More dramatic tilt -->
	 * <Logo tier1={{ dark: '#ff0000', light: '#ffcccc' }} />
	 * ```
	 *
	 * @example Interactive and animated
	 * ```svelte
	 * <Logo interactive />  <!-- Hover effects -->
	 * <Logo breathing />  <!-- Gentle pulse animation -->
	 * <Logo shadow />  <!-- Drop shadow -->
	 * ```
	 */

	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { browser } from '$app/environment';

	// ─────────────────────────────────────────────────────────────────────────────
	// TYPES
	// ─────────────────────────────────────────────────────────────────────────────

	export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'midnight';
	export type BreathingSpeed = 'slow' | 'normal' | 'fast';
	export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number;

	/** Color pair for a branch tier (dark side / light side) */
	export interface TierColors {
		dark: string;
		light: string;
	}

	/** Color pair for the trunk */
	export interface TrunkColors {
		dark: string;
		light: string;
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// SEASONAL COLOR PALETTES
	// ─────────────────────────────────────────────────────────────────────────────

	const SEASONAL_PALETTES = {
		spring: {
			// Rose Gold — Cherry blossoms, hope, renewal
			tier1: { dark: '#be185d', light: '#fecdd3' },
			tier2: { dark: '#9d174d', light: '#fda4af' },
			tier3: { dark: '#831843', light: '#fb7185' },
			trunk: { dark: '#5a3f30', light: '#6f4d39' }
		},
		summer: {
			// Sunlit — Lush growth, warmth, vitality
			tier1: { dark: '#15803d', light: '#86efac' },
			tier2: { dark: '#166534', light: '#4ade80' },
			tier3: { dark: '#14532d', light: '#22c55e' },
			trunk: { dark: '#3d2914', light: '#5a3f30' }
		},
		autumn: {
			// Sunset — Harvest, reflection, warm embrace
			tier1: { dark: '#DC2626', light: '#FCD34D' },
			tier2: { dark: '#991B1B', light: '#F59E0B' },
			tier3: { dark: '#7C2D12', light: '#EA580C' },
			trunk: { dark: '#5C3317', light: '#8B4520' }
		},
		winter: {
			// Ice — Stillness, rest, crystalline beauty
			tier1: { dark: '#1e3a5f', light: '#bfdbfe' },
			tier2: { dark: '#1e3a5f', light: '#93c5fd' },
			tier3: { dark: '#0f172a', light: '#60a5fa' },
			trunk: { dark: '#1e293b', light: '#334155' }
		},
		midnight: {
			// Rose Bloom — The queer fifth season, purple twilight, magic
			tier1: { dark: '#4c1d95', light: '#fce7f3' },
			tier2: { dark: '#3b0764', light: '#f9a8d4' },
			tier3: { dark: '#1e1b4b', light: '#ec4899' },
			trunk: { dark: '#1a1a2e', light: '#2d1b4e' }
		}
	} as const;

	// Size presets in pixels
	const SIZE_PRESETS = {
		xs: 16,
		sm: 24,
		md: 32,
		lg: 48,
		xl: 64,
		'2xl': 80,
		'3xl': 120
	} as const;

	// Breathing speed presets (ms per half-cycle)
	const BREATHING_SPEEDS = {
		slow: 1500,
		normal: 800,
		fast: 400
	} as const;

	// ─────────────────────────────────────────────────────────────────────────────
	// PROPS
	// ─────────────────────────────────────────────────────────────────────────────

	interface Props {
		/** CSS class for sizing (e.g., 'w-8 h-8'). Overridden if `size` is set. */
		class?: string;

		// ── Season & Colors ──────────────────────────────────────────────────────

		/** Seasonal color theme */
		season?: Season;

		/** Override tier 1 (top) branch colors */
		tier1?: TierColors;

		/** Override tier 2 (middle) branch colors */
		tier2?: TierColors;

		/** Override tier 3 (bottom) branch colors */
		tier3?: TierColors;

		/** Override trunk colors */
		trunk?: TrunkColors;

		/** Use a single color for the entire logo (foliage only) */
		monochromeColor?: string;

		/** Make trunk match foliage colors */
		monochromeTrunk?: boolean;

		// ── Size & Geometry ──────────────────────────────────────────────────────

		/** Size preset or pixel value. Overrides class-based sizing. */
		size?: LogoSize;

		/** Rotation in degrees. Negative = lean left. Default: -12 */
		rotation?: number;

		// ── Animation ────────────────────────────────────────────────────────────

		/** Enable breathing/pulse animation */
		breathing?: boolean;

		/** Speed of breathing animation */
		breathingSpeed?: BreathingSpeed;

		// ── Effects & Interactivity ──────────────────────────────────────────────

		/** Add subtle drop shadow */
		shadow?: boolean;

		/** Enable hover effects (slight scale, glow) */
		interactive?: boolean;

		/** Click handler */
		onclick?: (event: MouseEvent) => void;

		// ── Accessibility & IDs ──────────────────────────────────────────────────

		/** Accessible label for the logo */
		ariaLabel?: string;

		/** Unique ID prefix for SVG filters (auto-generated if not provided) */
		filterId?: string;

		/** Additional title for tooltip on hover */
		title?: string;
	}

	let {
		class: className = '',
		season = 'summer',
		tier1,
		tier2,
		tier3,
		trunk,
		monochromeColor,
		monochromeTrunk = false,
		size,
		rotation = -12,
		breathing = false,
		breathingSpeed = 'normal',
		shadow = false,
		interactive = false,
		onclick,
		ariaLabel = 'Grove logo',
		filterId,
		title
	}: Props = $props();

	// ─────────────────────────────────────────────────────────────────────────────
	// DERIVED VALUES
	// ─────────────────────────────────────────────────────────────────────────────

	// Generate unique ID for SVG elements
	const randomId = `grove-logo-${Math.random().toString(36).slice(2, 9)}`;
	const uniqueId = $derived(filterId ?? randomId);

	// Get the palette for the current season
	const palette = $derived(SEASONAL_PALETTES[season]);

	// Compute final colors with overrides
	const colors = $derived({
		tier1: monochromeColor
			? { dark: monochromeColor, light: monochromeColor }
			: (tier1 ?? palette.tier1),
		tier2: monochromeColor
			? { dark: monochromeColor, light: monochromeColor }
			: (tier2 ?? palette.tier2),
		tier3: monochromeColor
			? { dark: monochromeColor, light: monochromeColor }
			: (tier3 ?? palette.tier3),
		trunk: monochromeTrunk && monochromeColor
			? { dark: monochromeColor, light: monochromeColor }
			: (trunk ?? palette.trunk)
	});

	// Compute size styles
	const sizeStyles = $derived.by(() => {
		if (!size) return undefined;

		const pixels = typeof size === 'number' ? size : SIZE_PRESETS[size];
		return `width: ${pixels}px; height: ${pixels}px;`;
	});

	// Compute final class (use Tailwind sizing if no explicit size)
	const finalClass = $derived.by(() => {
		const base = size ? '' : (className || 'w-8 h-8');
		const interactiveClass = interactive ? 'cursor-pointer transition-transform hover:scale-105' : '';
		return [base, interactiveClass].filter(Boolean).join(' ');
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// REDUCED MOTION
	// ─────────────────────────────────────────────────────────────────────────────

	const reducedMotionQuery = browser ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	let prefersReducedMotion = $state(reducedMotionQuery?.matches ?? false);

	$effect(() => {
		if (!reducedMotionQuery) return;
		const handler = (e: MediaQueryListEvent) => { prefersReducedMotion = e.matches; };
		reducedMotionQuery.addEventListener('change', handler);
		return () => reducedMotionQuery.removeEventListener('change', handler);
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// BREATHING ANIMATION
	// ─────────────────────────────────────────────────────────────────────────────

	const breathValue = tweened(0, { easing: cubicInOut });

	$effect(() => {
		const duration = BREATHING_SPEEDS[breathingSpeed];

		if (!breathing || prefersReducedMotion) {
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

	// Scale transform for breathing (subtle 1.0 -> 1.05)
	const breathScale = $derived(1 + $breathValue * 0.05);
	const breathTransform = $derived(breathing ? `scale(${breathScale})` : '');

	// ─────────────────────────────────────────────────────────────────────────────
	// SVG PATHS
	// ─────────────────────────────────────────────────────────────────────────────

	// The logo is built from triangular branch pairs and a trunk
	// ViewBox: 0 0 100 100

	// Tier 1 (top branches)
	const tier1DarkPath = "M50 5 L18 32 L50 18 Z";
	const tier1LightPath = "M50 5 L50 18 L82 32 Z";

	// Tier 2 (middle branches)
	const tier2DarkPath = "M50 20 L12 50 L50 35 Z";
	const tier2LightPath = "M50 20 L50 35 L88 50 Z";

	// Tier 3 (bottom branches)
	const tier3DarkPath = "M50 38 L18 68 L50 54 Z";
	const tier3LightPath = "M50 38 L50 54 L82 68 Z";

	// Trunk (two-tone for depth)
	const trunkDarkPath = "M50 54 L42 58 L46 92 L50 92 Z";
	const trunkLightPath = "M50 54 L58 58 L54 92 L50 92 Z";
</script>

<svg
	class={finalClass}
	style={sizeStyles}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 100"
	aria-label={ariaLabel}
	role={onclick ? 'button' : 'img'}
	tabindex={onclick ? 0 : undefined}
	onclick={onclick}
	onkeydown={(e) => onclick && (e.key === 'Enter' || e.key === ' ') && onclick(e as unknown as MouseEvent)}
>
	{#if title}
		<title>{title}</title>
	{/if}

	{#if shadow}
		<defs>
			<filter id="{uniqueId}-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.25" />
			</filter>
		</defs>
	{/if}

	<!-- Main tree group with rotation and breathing -->
	<g
		transform="rotate({rotation} 50 50)"
		style={breathTransform ? `transform-origin: 50px 50px; transform: ${breathTransform};` : undefined}
		filter={shadow ? `url(#${uniqueId}-shadow)` : undefined}
	>
		<!-- Tier 1: Top branches -->
		<path fill={colors.tier1.dark} d={tier1DarkPath} />
		<path fill={colors.tier1.light} d={tier1LightPath} />

		<!-- Tier 2: Middle branches -->
		<path fill={colors.tier2.dark} d={tier2DarkPath} />
		<path fill={colors.tier2.light} d={tier2LightPath} />

		<!-- Tier 3: Bottom branches -->
		<path fill={colors.tier3.dark} d={tier3DarkPath} />
		<path fill={colors.tier3.light} d={tier3LightPath} />

		<!-- Trunk -->
		<path fill={colors.trunk.dark} d={trunkDarkPath} />
		<path fill={colors.trunk.light} d={trunkLightPath} />
	</g>
</svg>
