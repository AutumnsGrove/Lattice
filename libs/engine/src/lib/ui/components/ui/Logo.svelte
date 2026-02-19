<script lang="ts">
	/**
	 * Grove Logo Component — The Tree Mark
	 *
	 * A beautifully crafted tree logo with seasonal color palettes,
	 * 3D depth through light/dark branch splits, and extensive customization.
	 * Features an optional circular glass background (enabled by default) that
	 * provides the signature Grove treatment—tree inside a frosted grove-green circle.
	 *
	 * The logo features three tiers of branches with a gentle -12° windswept lean
	 * by default for an organic feel.
	 *
	 * ## Seasons
	 * - `spring` — Rose Gold (cherry blossoms)
	 * - `summer` — Sunlit (lush green) [default]
	 * - `autumn` — Sunset (warm red/gold)
	 * - `winter` — Ice (cool blue)
	 * - `midnight` — Rose Bloom (purple/pink, the queer fifth season 🌙)
	 *
	 * Season changes only affect the tree itself—the circular background remains
	 * consistent across all seasons but adapts to light/dark theme automatically.
	 *
	 * @example Basic usage (with glass background)
	 * ```svelte
	 * <Logo />
	 * <Logo season="autumn" />
	 * <Logo season="midnight" size="lg" />
	 * ```
	 *
	 * @example Without background (standalone tree)
	 * ```svelte
	 * <Logo background={false} />
	 * ```
	 *
	 * @example Background adapts to theme automatically
	 * ```svelte
	 * <Logo />  <!-- auto-detects light/dark from theme -->
	 * <Logo bgVariant="light" />  <!-- force light variant -->
	 * <Logo bgVariant="dark" />  <!-- force dark variant -->
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
	 * <Logo rotation={-20} />  <!-- More dramatic tilt -->
	 * <Logo rotation={0} />  <!-- Upright (no windswept) -->
	 * <Logo tier1={{ dark: '#ff0000', light: '#ffcccc' }} />
	 * ```
	 *
	 * @example Interactive
	 * ```svelte
	 * <Logo interactive />  <!-- Hover effects -->
	 * <Logo shadow />  <!-- Drop shadow -->
	 * ```
	 *
	 * @example Monochrome (flat, single-tone per element)
	 * ```svelte
	 * <Logo monochrome />  <!-- Removes split-tone, keeps tier variation -->
	 * <Logo monochrome season="autumn" />  <!-- Flat autumn colors -->
	 * ```
	 */

	import type { Season } from '$lib/ui/types/season';
	import { browser } from '$app/environment';

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

		/**
		 * Remove the split-tone effect (single tonality per element).
		 * When true, each tier uses one flat color instead of dark/light sides.
		 * Preserves tier-to-tier variation and trunk/foliage differentiation.
		 * Useful for visual consistency with single-toned tree assets.
		 */
		monochrome?: boolean;

		// ── Background ───────────────────────────────────────────────────────────

		/**
		 * Show the circular glass background behind the tree.
		 * The background remains consistent regardless of season changes.
		 * Default: true
		 */
		background?: boolean;

		/**
		 * Background color variant.
		 * - 'dark': Deep grove greens (best on dark/colored backgrounds)
		 * - 'light': Soft translucent greens (for light/white backgrounds)
		 * - undefined: Auto-detects from current theme (default)
		 */
		bgVariant?: 'dark' | 'light';

		/**
		 * Background opacity (0-1). Controls overall visibility of the circle.
		 * Default: 1
		 */
		bgOpacity?: number;

		/**
		 * Custom background color override. Replaces the gradient with a solid fill.
		 * When set, overrides bgVariant.
		 */
		bgColor?: string;

		// ── Size & Geometry ──────────────────────────────────────────────────────

		/** Size preset or pixel value. Overrides class-based sizing. */
		size?: LogoSize;

		/** Rotation in degrees. Negative = lean left. Default: -12 (gentle windswept) */
		rotation?: number;

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
		monochrome = false,
		background = true,
		bgVariant,
		bgOpacity = 1,
		bgColor,
		size,
		rotation = -12,
		shadow = false,
		interactive = false,
		onclick,
		ariaLabel = 'Grove logo',
		filterId,
		title
	}: Props = $props();

	// ─────────────────────────────────────────────────────────────────────────────
	// BACKGROUND CONFIGURATION
	// ─────────────────────────────────────────────────────────────────────────────

	// Background circle dimensions (relative to the 100-unit tree viewBox)
	// When background is enabled, we expand the viewBox to fit the circle around the tree
	const BG_VIEWBOX = '-28 -28 156 156'; // 156-unit canvas, tree at 0-100
	const BG_CENTER = 50; // Circle center aligns with tree center
	const BG_RADIUS = 70; // Circle radius within the 156-unit space

	// Gradient colors for the two variants
	const BG_GRADIENTS = {
		dark: {
			center: '#122a1a',
			mid: '#0f2015',
			edge: '#0d1a12',
			highlightOpacity: 0.06,
			borderColor: 'rgba(34, 197, 94, 0.12)',
		},
		light: {
			center: '#f0fdf4',
			mid: '#dcfce7',
			edge: '#d1fae5',
			highlightOpacity: 0.2,
			borderColor: 'rgba(21, 128, 61, 0.12)',
		},
	} as const;

	// ─────────────────────────────────────────────────────────────────────────────
	// THEME-AWARE BACKGROUND
	// ─────────────────────────────────────────────────────────────────────────────

	// Track the current theme state by watching the document's .dark class directly.
	// This is more reliable than going through the store, as it reflects the actual
	// DOM state regardless of how the theme was set (store, localStorage, system pref).
	let isDarkMode = $state(browser ? document.documentElement.classList.contains('dark') : false);

	// Watch for theme changes via MutationObserver on the document element
	$effect(() => {
		if (!browser) return;

		// Set initial state
		isDarkMode = document.documentElement.classList.contains('dark');

		// Watch for class changes on <html> element
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.attributeName === 'class') {
					isDarkMode = document.documentElement.classList.contains('dark');
				}
			}
		});

		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		return () => observer.disconnect();
	});

	// Auto-detect bgVariant from theme when not explicitly set
	const effectiveBgVariant = $derived(bgVariant ?? (isDarkMode ? 'dark' : 'light'));

	// ─────────────────────────────────────────────────────────────────────────────
	// DERIVED VALUES
	// ─────────────────────────────────────────────────────────────────────────────

	// Generate unique ID for SVG elements
	const randomId = `grove-logo-${Math.random().toString(36).slice(2, 9)}`;
	const uniqueId = $derived(filterId ?? randomId);

	// Compute the active viewBox based on background state
	const viewBox = $derived(background ? BG_VIEWBOX : '0 0 100 100');

	// Compute background gradient colors
	const bgGradient = $derived(BG_GRADIENTS[effectiveBgVariant]);

	// Get the palette for the current season
	const palette = $derived(SEASONAL_PALETTES[season]);

	/** Flatten a tier to single-tone (uses dark color for both sides) */
	const flattenTier = (tierColors: TierColors): TierColors => ({
		dark: tierColors.dark,
		light: tierColors.dark
	});

	// Compute final colors with overrides
	const colors = $derived.by(() => {
		// Determine base tier colors (custom overrides or seasonal palette)
		const baseTier1 = tier1 ?? palette.tier1;
		const baseTier2 = tier2 ?? palette.tier2;
		const baseTier3 = tier3 ?? palette.tier3;
		const baseTrunk = trunk ?? palette.trunk;

		// monochromeColor takes precedence: single color for entire logo
		if (monochromeColor) {
			const flatColor = { dark: monochromeColor, light: monochromeColor };
			return {
				tier1: flatColor,
				tier2: flatColor,
				tier3: flatColor,
				trunk: monochromeTrunk ? flatColor : baseTrunk
			};
		}

		// monochrome: flatten each tier (removes split-tone, keeps tier variation)
		if (monochrome) {
			return {
				tier1: flattenTier(baseTier1),
				tier2: flattenTier(baseTier2),
				tier3: flattenTier(baseTier3),
				trunk: flattenTier(baseTrunk)
			};
		}

		// Default: full split-tone effect
		return {
			tier1: baseTier1,
			tier2: baseTier2,
			tier3: baseTier3,
			trunk: baseTrunk
		};
	});

	// Compute size styles
	const sizeStyles = $derived.by(() => {
		if (!size) return undefined;

		const pixels = typeof size === 'number' ? size : SIZE_PRESETS[size];
		return `width: ${pixels}px; height: ${pixels}px;`;
	});

	// Compute final class (use Tailwind sizing if no explicit size)
	// Uses motion-safe: to respect prefers-reduced-motion for transitions
	const finalClass = $derived.by(() => {
		const base = size ? '' : (className || 'w-8 h-8');
		const interactiveClass = interactive
			? 'cursor-pointer motion-safe:transition-transform motion-safe:hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current rounded-sm'
			: '';
		return [base, interactiveClass].filter(Boolean).join(' ');
	});

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
	// Trunk extends to y=100 to match viewBox bottom, ensuring tree "sticks" to ground properly
	const trunkDarkPath = "M50 54 L42 58 L46 100 L50 100 Z";
	const trunkLightPath = "M50 54 L58 58 L54 100 L50 100 Z";
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<svg
	class={finalClass}
	style={sizeStyles}
	xmlns="http://www.w3.org/2000/svg"
	viewBox={viewBox}
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
		{#if shadow}
			<filter id="{uniqueId}-shadow" x="-20%" y="-20%" width="140%" height="140%">
				<feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.25" />
			</filter>
		{/if}

		{#if background}
			<!-- Background circle gradients -->
			<radialGradient id="{uniqueId}-bg-gradient" cx="50%" cy="50%" r="50%">
				{#if bgColor}
					<stop offset="0%" stop-color={bgColor} />
					<stop offset="100%" stop-color={bgColor} />
				{:else}
					<stop offset="0%" stop-color={bgGradient.center} />
					<stop offset="70%" stop-color={bgGradient.mid} />
					<stop offset="100%" stop-color={bgGradient.edge} />
				{/if}
			</radialGradient>
			<radialGradient id="{uniqueId}-bg-highlight" cx="35%" cy="30%" r="50%">
				<stop offset="0%" stop-color="rgba(255, 255, 255, {bgGradient.highlightOpacity})" />
				<stop offset="100%" stop-color="rgba(255, 255, 255, 0)" />
			</radialGradient>
		{/if}
	</defs>

	{#if background}
		<!-- Circular glass background (season-independent) -->
		<g opacity={bgOpacity}>
			<circle cx={BG_CENTER} cy={BG_CENTER} r={BG_RADIUS} fill="url(#{uniqueId}-bg-gradient)" />
			<circle cx={BG_CENTER} cy={BG_CENTER} r={BG_RADIUS} fill="url(#{uniqueId}-bg-highlight)" />
			<circle cx={BG_CENTER} cy={BG_CENTER} r={BG_RADIUS}
				fill="none"
				stroke={bgGradient.borderColor}
				stroke-width="1.5"
			/>
		</g>
	{/if}

	<!-- Main tree group with rotation -->
	<g
		transform="rotate({rotation} 50 50)"
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
