<script lang="ts">
	/**
	 * GlassLogo — Grove Tree Logo with Glassmorphism
	 *
	 * A beautiful translucent tree logo with frosted glass effects,
	 * gradient fills, soft glows, and seasonal accents. Perfect for
	 * hero sections, glass cards, and modern UI designs.
	 *
	 * The glass effect creates readability while revealing hints of
	 * background decoration — following the Grove layering formula:
	 * Background → Decorative → Glass Surface → Content
	 *
	 * ## Seasons
	 * - `spring` — Rose Gold with cherry blossom accents
	 * - `summer` — Sunlit (lush green) [default]
	 * - `autumn` — Sunset (warm red/gold)
	 * - `winter` — Ice (cool blue) with snow caps
	 * - `midnight` — Rose Bloom (the queer fifth season 🌙)
	 *
	 * ## Glass Variants
	 * - `default` — Standard translucent glass
	 * - `accent` — Uses accent color with higher saturation
	 * - `frosted` — More opaque, muted effect
	 * - `dark` — Dark glass for light backgrounds
	 * - `ethereal` — Dreamy, strong glow effect
	 *
	 * @example Basic glass logo
	 * ```svelte
	 * <GlassLogo class="w-16 h-16" />
	 * ```
	 *
	 * @example Seasonal glass logo
	 * ```svelte
	 * <GlassLogo season="winter" />
	 * <GlassLogo season="midnight" variant="ethereal" />
	 * <GlassLogo season="spring" seasonalAccents />
	 * ```
	 *
	 * @example Size and effects
	 * ```svelte
	 * <GlassLogo size="xl" shadow />
	 * <GlassLogo size={100} interactive />
	 * ```
	 */

	import type { GlassVariant } from './types';
	import type { Season } from '$lib/ui/types/season';

	// ─────────────────────────────────────────────────────────────────────────────
	// TYPES
	// ─────────────────────────────────────────────────────────────────────────────

	export type { Season };
	export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number;

	/** Color pair for a branch tier (dark side / light side) */
	export interface TierColors {
		dark: string;
		light: string;
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// SEASONAL COLOR PALETTES (GLASS-TINTED VERSIONS)
	// ─────────────────────────────────────────────────────────────────────────────

	const SEASONAL_PALETTES = {
		spring: {
			// Rose Gold — Cherry blossoms, hope, renewal
			primary: 'rgba(190, 24, 93, 0.75)',        // #be185d
			secondary: 'rgba(254, 205, 211, 0.5)',    // #fecdd3
			glow: 'rgba(236, 72, 153, 0.35)',         // pink-500
			shadow: 'rgba(157, 23, 77, 0.2)',         // #9d174d
			tier1: { dark: '#be185d', light: '#fecdd3' },
			tier2: { dark: '#9d174d', light: '#fda4af' },
			tier3: { dark: '#831843', light: '#fb7185' },
			trunk: { dark: '#5a3f30', light: '#6f4d39' }
		},
		summer: {
			// Sunlit — Lush growth, warmth, vitality
			primary: 'rgba(21, 128, 61, 0.75)',       // #15803d
			secondary: 'rgba(134, 239, 172, 0.5)',   // #86efac
			glow: 'rgba(34, 197, 94, 0.35)',          // green-500
			shadow: 'rgba(22, 101, 52, 0.2)',         // #166534
			tier1: { dark: '#15803d', light: '#86efac' },
			tier2: { dark: '#166534', light: '#4ade80' },
			tier3: { dark: '#14532d', light: '#22c55e' },
			trunk: { dark: '#3d2914', light: '#5a3f30' }
		},
		autumn: {
			// Sunset — Harvest, reflection, warm embrace
			primary: 'rgba(220, 38, 38, 0.75)',       // #DC2626
			secondary: 'rgba(252, 211, 77, 0.5)',    // #FCD34D
			glow: 'rgba(234, 88, 12, 0.35)',          // orange-600
			shadow: 'rgba(153, 27, 27, 0.2)',         // #991B1B
			tier1: { dark: '#DC2626', light: '#FCD34D' },
			tier2: { dark: '#991B1B', light: '#F59E0B' },
			tier3: { dark: '#7C2D12', light: '#EA580C' },
			trunk: { dark: '#5C3317', light: '#8B4520' }
		},
		winter: {
			// Ice — Stillness, rest, crystalline beauty
			primary: 'rgba(30, 58, 95, 0.6)',         // #1e3a5f (muted)
			secondary: 'rgba(191, 219, 254, 0.4)',   // #bfdbfe
			glow: 'rgba(96, 165, 250, 0.3)',          // blue-400
			shadow: 'rgba(15, 23, 42, 0.15)',         // #0f172a
			tier1: { dark: '#1e3a5f', light: '#bfdbfe' },
			tier2: { dark: '#1e3a5f', light: '#93c5fd' },
			tier3: { dark: '#0f172a', light: '#60a5fa' },
			trunk: { dark: '#1e293b', light: '#334155' }
		},
		midnight: {
			// Rose Bloom — The queer fifth season, purple twilight, magic
			// Aligns with Grove's Midnight Bloom palette
			primary: 'rgba(76, 29, 149, 0.75)',       // #4c1d95
			secondary: 'rgba(252, 231, 243, 0.5)',   // #fce7f3
			glow: 'rgba(236, 72, 153, 0.4)',          // pink-500 (strong)
			shadow: 'rgba(30, 27, 75, 0.25)',         // #1e1b4b
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

	// Snow color for winter accents
	const SNOW_COLOR = 'rgba(248, 250, 252, 0.9)'; // slate-50

	// Blossom color for spring accents
	const BLOSSOM_COLOR = 'rgba(251, 207, 232, 0.85)'; // pink-200

	// ─────────────────────────────────────────────────────────────────────────────
	// PROPS
	// ─────────────────────────────────────────────────────────────────────────────

	interface Props {
		/** CSS class for sizing (e.g., 'w-8 h-8'). Overridden if `size` is set. */
		class?: string;

		// ── Season & Variant ─────────────────────────────────────────────────────

		/** Seasonal color theme */
		season?: Season;

		/** Glass style variant */
		variant?: GlassVariant;

		/** Custom accent color (CSS color value) - overrides seasonal colors */
		accentColor?: string;

		// ── Size & Geometry ──────────────────────────────────────────────────────

		/** Size preset or pixel value. Overrides class-based sizing. */
		size?: LogoSize;

		/** Rotation in degrees. Negative = lean left. Default: 0 (upright) */
		rotation?: number;

		// ── Effects ──────────────────────────────────────────────────────────────

		/** Add subtle drop shadow */
		shadow?: boolean;

		/** Enable hover effects (slight scale) */
		interactive?: boolean;

		/** Show trunk with matching color (otherwise uses seasonal trunk colors) */
		monochromeTrunk?: boolean;

		/** Show seasonal accents (snow for winter, blossoms for spring) */
		seasonalAccents?: boolean;

		// ── Accessibility & IDs ──────────────────────────────────────────────────

		/** Click handler */
		onclick?: (event: MouseEvent) => void;

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
		variant = 'default',
		accentColor,
		size,
		rotation = 0,
		shadow = false,
		interactive = false,
		monochromeTrunk = false,
		seasonalAccents = true,
		onclick,
		ariaLabel = 'Grove logo',
		filterId,
		title
	}: Props = $props();

	// ─────────────────────────────────────────────────────────────────────────────
	// DERIVED VALUES
	// ─────────────────────────────────────────────────────────────────────────────

	// Generate unique ID for SVG elements
	const randomId = `glass-logo-${Math.random().toString(36).slice(2, 9)}`;
	const uniqueId = $derived(filterId ?? randomId);

	// Check for seasonal accents
	const isWinter = $derived(season === 'winter');
	const isSpring = $derived(season === 'spring');

	// Get the palette for the current season
	const palette = $derived(SEASONAL_PALETTES[season]);

	// ─────────────────────────────────────────────────────────────────────────────
	// GLASS VARIANT COLORS
	// ─────────────────────────────────────────────────────────────────────────────

	const glassColors = $derived.by(() => {
		const p = palette;
		const custom = accentColor;

		const variants = {
			default: {
				gradientStart: custom ? `${custom}cc` : p.primary,
				gradientEnd: custom ? `${custom}80` : p.secondary,
				highlight: 'rgba(255, 255, 255, 0.9)',
				shadow: p.shadow,
				glowColor: custom ? `${custom}4d` : p.glow,
				trunkStart: monochromeTrunk ? p.primary : `rgba(93, 64, 55, 0.7)`,
				trunkEnd: monochromeTrunk ? p.secondary : `rgba(93, 64, 55, 0.5)`
			},
			accent: {
				gradientStart: custom ? `${custom}cc` : p.primary.replace('0.75)', '0.85)'),
				gradientEnd: custom ? `${custom}99` : p.secondary.replace('0.5)', '0.7)'),
				highlight: 'rgba(255, 255, 255, 0.6)',
				shadow: p.shadow.replace('0.2)', '0.3)'),
				glowColor: custom ? `${custom}66` : p.glow.replace(/0\.\d+\)$/, '0.5)'),
				trunkStart: monochromeTrunk ? p.primary : `rgba(93, 64, 55, 0.8)`,
				trunkEnd: monochromeTrunk ? p.secondary : `rgba(93, 64, 55, 0.6)`
			},
			frosted: {
				gradientStart: p.primary.replace(/0\.\d+\)$/, '0.85)'),
				gradientEnd: p.secondary.replace(/0\.\d+\)$/, '0.7)'),
				highlight: 'rgba(255, 255, 255, 0.95)',
				shadow: 'rgba(100, 116, 139, 0.15)',
				glowColor: p.glow.replace(/0\.\d+\)$/, '0.2)'),
				trunkStart: `rgba(93, 64, 55, 0.85)`,
				trunkEnd: `rgba(93, 64, 55, 0.65)`
			},
			dark: {
				gradientStart: 'rgba(30, 41, 59, 0.7)',
				gradientEnd: 'rgba(15, 23, 42, 0.6)',
				highlight: 'rgba(148, 163, 184, 0.4)',
				shadow: 'rgba(0, 0, 0, 0.3)',
				glowColor: p.glow.replace(/0\.\d+\)$/, '0.2)'),
				trunkStart: `rgba(60, 45, 38, 0.8)`,
				trunkEnd: `rgba(60, 45, 38, 0.6)`
			},
			ethereal: {
				gradientStart: p.primary.replace(/0\.\d+\)$/, '0.4)'),
				gradientEnd: p.secondary.replace(/0\.\d+\)$/, '0.25)'),
				highlight: 'rgba(255, 255, 255, 0.7)',
				shadow: p.shadow,
				glowColor: p.glow.replace(/0\.\d+\)$/, '0.5)'),
				trunkStart: `rgba(93, 64, 55, 0.5)`,
				trunkEnd: `rgba(93, 64, 55, 0.3)`
			}
		};

		return variants[variant];
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// SIZE COMPUTATION
	// ─────────────────────────────────────────────────────────────────────────────

	const sizeStyles = $derived.by(() => {
		if (!size) return undefined;
		const pixels = typeof size === 'number' ? size : SIZE_PRESETS[size];
		return `width: ${pixels}px; height: ${pixels}px;`;
	});

	const finalClass = $derived.by(() => {
		const base = size ? '' : (className || 'w-8 h-8');
		// Uses motion-safe: to respect prefers-reduced-motion for transitions
		const interactiveClass = interactive
			? 'cursor-pointer motion-safe:transition-transform motion-safe:hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm'
			: '';
		return [base, interactiveClass].filter(Boolean).join(' ');
	});

	// Static glow intensity for glass effect
	const glowIntensity = 4;

	// ─────────────────────────────────────────────────────────────────────────────
	// SVG PATHS
	// ─────────────────────────────────────────────────────────────────────────────

	// Tier 1 (top branches)
	const tier1DarkPath = "M50 5 L18 32 L50 18 Z";
	const tier1LightPath = "M50 5 L50 18 L82 32 Z";

	// Tier 2 (middle branches)
	const tier2DarkPath = "M50 20 L12 50 L50 35 Z";
	const tier2LightPath = "M50 20 L50 35 L88 50 Z";

	// Tier 3 (bottom branches)
	const tier3DarkPath = "M50 38 L18 68 L50 54 Z";
	const tier3LightPath = "M50 38 L50 54 L82 68 Z";

	// Trunk (extends to y=100 to match viewBox bottom, ensuring tree "sticks" to ground properly)
	const trunkDarkPath = "M50 54 L42 58 L46 100 L50 100 Z";
	const trunkLightPath = "M50 54 L58 58 L54 100 L50 100 Z";
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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

	<defs>
		<!-- Foliage gradient (tier agnostic for glass effect) -->
		<linearGradient id="{uniqueId}-foliage-grad" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color={glassColors.gradientStart} />
			<stop offset="50%" stop-color={glassColors.gradientEnd} />
			<stop offset="100%" stop-color={glassColors.gradientStart} />
		</linearGradient>

		<!-- Highlight gradient (top-left shine) -->
		<linearGradient id="{uniqueId}-highlight" x1="0%" y1="0%" x2="50%" y2="50%">
			<stop offset="0%" stop-color={glassColors.highlight} />
			<stop offset="100%" stop-color="transparent" />
		</linearGradient>

		<!-- Trunk gradient -->
		<linearGradient id="{uniqueId}-trunk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color={glassColors.trunkStart} />
			<stop offset="100%" stop-color={glassColors.trunkEnd} />
		</linearGradient>

		<!-- Soft glow filter -->
		<filter id="{uniqueId}-glow" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur in="SourceGraphic" stdDeviation={glowIntensity} result="blur" />
			<feFlood flood-color={glassColors.glowColor} />
			<feComposite in2="blur" operator="in" />
			<feMerge>
				<feMergeNode />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>

		<!-- Inner shadow/depth filter -->
		<filter id="{uniqueId}-inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
			<feOffset dx="1" dy="1" />
			<feGaussianBlur stdDeviation="2" result="shadow" />
			<feFlood flood-color={glassColors.shadow} />
			<feComposite in2="shadow" operator="in" />
			<feComposite in2="SourceGraphic" operator="over" />
		</filter>

		{#if shadow}
			<filter id="{uniqueId}-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="1" dy="2" stdDeviation="3" flood-opacity="0.3" />
			</filter>
		{/if}
	</defs>

	<!-- Main tree group with rotation -->
	<g
		transform="rotate({rotation} 50 50)"
		filter={shadow ? `url(#${uniqueId}-drop-shadow)` : undefined}
	>
		<!-- Trunk with glass effect -->
		<g filter="url(#{uniqueId}-inner-shadow)">
			<path fill="url(#{uniqueId}-trunk-grad)" d={trunkDarkPath} />
			<path fill="url(#{uniqueId}-trunk-grad)" d={trunkLightPath} />
		</g>

		<!-- Foliage with glow effect -->
		<g filter="url(#{uniqueId}-glow)">
			<!-- Tier 1 -->
			<path fill="url(#{uniqueId}-foliage-grad)" d={tier1DarkPath} />
			<path fill="url(#{uniqueId}-foliage-grad)" d={tier1LightPath} opacity="0.85" />

			<!-- Tier 2 -->
			<path fill="url(#{uniqueId}-foliage-grad)" d={tier2DarkPath} />
			<path fill="url(#{uniqueId}-foliage-grad)" d={tier2LightPath} opacity="0.85" />

			<!-- Tier 3 -->
			<path fill="url(#{uniqueId}-foliage-grad)" d={tier3DarkPath} />
			<path fill="url(#{uniqueId}-foliage-grad)" d={tier3LightPath} opacity="0.85" />
		</g>

		<!-- Top-left highlight/shine overlay -->
		<g opacity="0.4">
			<path d={tier1DarkPath} fill="url(#{uniqueId}-highlight)" />
			<path d={tier2DarkPath} fill="url(#{uniqueId}-highlight)" />
			<path d={tier3DarkPath} fill="url(#{uniqueId}-highlight)" />
		</g>

		<!-- Subtle edge highlight -->
		<g stroke={glassColors.highlight} stroke-width="0.5" stroke-opacity="0.3" fill="none">
			<path d={tier1DarkPath} />
			<path d={tier1LightPath} />
			<path d={tier2DarkPath} />
			<path d={tier2LightPath} />
			<path d={tier3DarkPath} />
			<path d={tier3LightPath} />
		</g>
	</g>

	<!-- Seasonal accents (outside rotation group for natural orientation) -->
	{#if seasonalAccents && isWinter}
		<!-- Snow caps on branch tips -->
		<g transform="rotate({rotation} 50 50)">
			<!-- Top snow cap -->
			<ellipse fill={SNOW_COLOR} cx="50" cy="7" rx="8" ry="3" opacity="0.9" />
			<!-- Tier 1 branch tips -->
			<ellipse fill={SNOW_COLOR} cx="22" cy="30" rx="6" ry="2" opacity="0.75" transform="rotate(-15 22 30)" />
			<ellipse fill={SNOW_COLOR} cx="78" cy="30" rx="6" ry="2" opacity="0.75" transform="rotate(15 78 30)" />
			<!-- Tier 2 branch tips -->
			<ellipse fill={SNOW_COLOR} cx="16" cy="48" rx="5" ry="2" opacity="0.65" transform="rotate(-10 16 48)" />
			<ellipse fill={SNOW_COLOR} cx="84" cy="48" rx="5" ry="2" opacity="0.65" transform="rotate(10 84 48)" />
			<!-- Tier 3 branch tips -->
			<ellipse fill={SNOW_COLOR} cx="22" cy="66" rx="4" ry="1.5" opacity="0.55" transform="rotate(-5 22 66)" />
			<ellipse fill={SNOW_COLOR} cx="78" cy="66" rx="4" ry="1.5" opacity="0.55" transform="rotate(5 78 66)" />
		</g>
	{/if}

	{#if seasonalAccents && isSpring}
		<!-- Cherry blossom petals scattered around -->
		<g transform="rotate({rotation} 50 50)">
			<!-- Blossoms near top -->
			<circle fill={BLOSSOM_COLOR} cx="38" cy="12" r="2.5" opacity="0.8" />
			<circle fill={BLOSSOM_COLOR} cx="62" cy="14" r="2" opacity="0.7" />
			<!-- Blossoms on branches -->
			<circle fill={BLOSSOM_COLOR} cx="25" cy="35" r="2" opacity="0.75" />
			<circle fill={BLOSSOM_COLOR} cx="75" cy="38" r="2.5" opacity="0.8" />
			<circle fill={BLOSSOM_COLOR} cx="20" cy="55" r="1.5" opacity="0.65" />
			<circle fill={BLOSSOM_COLOR} cx="80" cy="52" r="2" opacity="0.7" />
			<!-- Falling petal -->
			<ellipse fill={BLOSSOM_COLOR} cx="70" cy="75" rx="2" ry="1" opacity="0.5" transform="rotate(25 70 75)" />
		</g>
	{/if}
</svg>
