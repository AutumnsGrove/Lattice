<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { ThemeGlass } from "@autumnsgrove/prism";
	import { BLUR_CSS } from "@autumnsgrove/prism";
	import { cn } from "$lib/ui/utils";
	import { GossamerClouds } from "@autumnsgrove/gossamer/svelte";

	/**
	 * Glass component for creating glassmorphism effects
	 *
	 * A reusable component that provides translucent, frosted-glass effects
	 * perfect for overlays, cards, navbars, and text containers while
	 * maintaining visibility of background elements.
	 *
	 * Variant names align with Prism's ThemeGlass interface (7 variants).
	 * Pass a `glass` prop to derive opacity/blur from theme-generated values
	 * instead of the built-in Tailwind defaults.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <Glass variant="card">
	 *   <p>Content with glass background</p>
	 * </Glass>
	 * ```
	 *
	 * @example Theme-driven glass
	 * ```svelte
	 * <Glass variant="frosted" glass={theme.glass}>
	 *   <p>Glass styled from theme values</p>
	 * </Glass>
	 * ```
	 *
	 * @example With Gossamer background
	 * ```svelte
	 * <Glass variant="card" gossamer="grove-mist">
	 *   <p>Content with animated ASCII clouds beneath the glass</p>
	 * </Glass>
	 * ```
	 */

	/**
	 * Glass variant names matching Prism's ThemeGlass interface.
	 * Exported for use by other Glass* components.
	 */
	export type GlassVariantName =
		| "surface" // Headers, navbars - highest opacity (95%)
		| "tint" // Text containers - medium opacity (60%)
		| "card" // Content cards - high opacity (80%)
		| "frosted" // Prominent panels - strong blur, high opacity (70%)
		| "accent" // Callouts, CTAs - accent-tinted (30%)
		| "overlay" // Modal backdrops - dark overlay (50%)
		| "muted"; // Subtle backgrounds - low opacity (40%)

	type Intensity =
		| "none" // No blur (just transparency)
		| "light" // backdrop-blur-sm (4px)
		| "medium" // backdrop-blur (8px)
		| "strong"; // backdrop-blur-md (12px)

	type Element = "div" | "section" | "article" | "aside" | "header" | "footer" | "nav" | "main";

	/** Available Gossamer presets */
	type GossamerPreset =
		| "grove-mist"
		| "grove-fireflies"
		| "grove-rain"
		| "grove-dew"
		| "winter-snow"
		| "summer-heat"
		| "ambient-static"
		| "ambient-clouds";

	/** Custom Gossamer configuration */
	interface GossamerConfig {
		pattern?: "perlin" | "fbm" | "waves" | "static" | "ripple";
		characters?: string;
		frequency?: number;
		amplitude?: number;
		speed?: number;
		cellSize?: number;
		animated?: boolean;
	}

	interface Props extends HTMLAttributes<HTMLElement> {
		/** Visual style variant (matches Prism ThemeGlass keys) */
		variant?: GlassVariantName;
		/** Blur intensity (overrides ThemeGlass blur when glass prop is set) */
		intensity?: Intensity;
		/** HTML element to render */
		as?: Element;
		/** Include subtle border */
		border?: boolean;
		/** Include shadow */
		shadow?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** Content */
		children?: Snippet;
		/**
		 * ThemeGlass configuration from the active theme.
		 * When provided, opacity/blur/border values are derived from the theme
		 * instead of the built-in Tailwind defaults.
		 */
		glass?: ThemeGlass;
		/**
		 * Gossamer ASCII background effect
		 * Pass a preset name (e.g., "grove-mist") or custom config object
		 */
		gossamer?: GossamerPreset | GossamerConfig | false;
		/** Override Gossamer color (works with presets too) */
		gossamerColor?: string;
		/** Override Gossamer opacity (0-1) */
		gossamerOpacity?: number;
		/** Override Gossamer animation speed */
		gossamerSpeed?: number;
		/** Disable Gossamer animation (show static pattern) */
		gossamerStatic?: boolean;
	}

	// svelte-ignore custom_element_props_identifier
	let {
		variant = "card",
		intensity = "light",
		as: element = "div",
		border = true,
		shadow = false,
		class: className,
		children,
		glass,
		gossamer = false,
		gossamerColor,
		gossamerOpacity,
		gossamerSpeed,
		gossamerStatic = false,
		...restProps
	}: Props = $props();

	// Determine if gossamer is a preset string or custom config
	const isPreset = $derived(typeof gossamer === "string");
	const gossamerPreset = $derived(isPreset ? (gossamer as GossamerPreset) : undefined);
	const gossamerConfig = $derived(!isPreset && gossamer ? (gossamer as GossamerConfig) : undefined);

	// --- Theme-driven glass (when `glass` prop is provided) ---

	/** Compute CSS custom properties from ThemeGlass for the active variant */
	const glassStyle = $derived.by(() => {
		if (!glass) return undefined;
		const v = glass[variant];
		return [
			`--_glass-bg:${v.background}`,
			`--_glass-bg-dark:${v.backgroundDark}`,
			`--_glass-border:${v.border}`,
			`--_glass-border-dark:${v.borderDark}`,
		].join(";");
	});

	/** Blur class derived from ThemeGlass variant (when glass prop provided) */
	const glassBlurStyle = $derived.by(() => {
		if (!glass) return undefined;
		const blurValue = BLUR_CSS[glass[variant].blur];
		return blurValue === "none" ? undefined : `backdrop-filter:${blurValue}`;
	});

	/** Combined inline style for theme-driven glass */
	const inlineStyle = $derived.by(() => {
		if (!glass) return undefined;
		const parts = [glassStyle, glassBlurStyle].filter(Boolean);
		return parts.length > 0 ? parts.join(";") : undefined;
	});

	// --- Tailwind fallback (when no `glass` prop) ---

	// Background colors per variant - warm grove tones, translucent for glass effect
	const variantClasses: Record<GlassVariantName, string> = {
		// High opacity for sticky headers/navbars (uses background color)
		surface: "bg-background/90 dark:bg-background/90",

		// Light tint for text readability
		tint: "bg-white/70 dark:bg-grove-950/20",

		// Medium opacity for content cards - translucent with grove warmth
		card: "bg-white/80 dark:bg-grove-950/25",

		// Frosted glass - strong blur, high opacity for prominent panels
		frosted: "bg-white/70 dark:bg-grove-950/35 backdrop-blur-lg",

		// Accent-colored glass for highlights/callouts
		accent: "bg-accent/25 dark:bg-accent/15",

		// Dark overlay for modals/sheets
		overlay: "bg-black/50 dark:bg-black/60",

		// Barely visible, very subtle
		muted: "bg-white/50 dark:bg-grove-950/15",
	};

	// Blur intensity classes - default to medium blur for true glass effect
	const intensityClasses: Record<Intensity, string> = {
		none: "",
		light: "backdrop-blur", // 8px
		medium: "backdrop-blur-md", // 12px
		strong: "backdrop-blur-lg", // 16px
	};

	// Border classes per variant - subtle borders that complement the glass
	const borderClasses: Record<GlassVariantName, string> = {
		surface: "border-border",
		tint: "border-white/30 dark:border-grove-800/20",
		card: "border-white/40 dark:border-grove-800/25",
		frosted: "border-white/50 dark:border-grove-800/30",
		accent: "border-accent/30 dark:border-accent/20",
		overlay: "border-white/10",
		muted: "border-white/20 dark:border-grove-800/15",
	};

	// Shadow classes
	const shadowClasses: Record<GlassVariantName, string> = {
		surface: "shadow-sm",
		tint: "shadow-sm",
		card: "shadow-sm",
		frosted: "shadow-sm",
		accent: "shadow-sm",
		overlay: "shadow-2xl",
		muted: "",
	};

	const computedClass = $derived(
		cn(
			// Add relative positioning and overflow hidden when gossamer is enabled
			gossamer && "relative overflow-hidden",
			// When glass prop is provided, use theme-driven styles via CSS class
			glass ? "glass-themed" : variantClasses[variant],
			// Blur: when glass provided, blur is set via inline style; otherwise use intensity classes
			!glass && intensityClasses[intensity],
			border && `border ${glass ? "glass-themed-border" : borderClasses[variant]}`,
			shadow && shadowClasses[variant],
			className,
		),
	);
</script>

<!--
  Glassmorphism component for Grove

  Two rendering modes:
  1. Theme-driven (glass prop): Styles derived from ThemeGlass values via CSS custom properties
  2. Tailwind fallback (no glass): Built-in classes approximating default grove theme

  Gossamer Integration:
  - When `gossamer` prop is set, renders ASCII cloud patterns behind the glass
  - The backdrop-blur creates a beautiful frosted effect over the ASCII

  Browser Support:
  - backdrop-filter is supported in all modern browsers
  - Falls back gracefully to solid backgrounds in older browsers
-->

<svelte:element this={element} class={computedClass} style={inlineStyle} {...restProps}>
	{#if gossamer}
		<GossamerClouds
			preset={gossamerPreset}
			pattern={gossamerConfig?.pattern}
			characters={gossamerConfig?.characters}
			frequency={gossamerConfig?.frequency}
			amplitude={gossamerConfig?.amplitude}
			speed={gossamerSpeed ?? gossamerConfig?.speed}
			cellSize={gossamerConfig?.cellSize}
			color={gossamerColor}
			opacity={gossamerOpacity}
			animated={!gossamerStatic && gossamerConfig?.animated !== false}
		/>
	{/if}

	<!-- Content layer (above Gossamer) -->
	{#if children}
		<div class="relative z-10">
			{@render children()}
		</div>
	{/if}
</svelte:element>

<style>
	/* Theme-driven glass: light mode uses --_glass-bg, dark mode uses --_glass-bg-dark */
	.glass-themed {
		background: var(--_glass-bg);
	}
	:global(.dark) .glass-themed {
		background: var(--_glass-bg-dark);
	}

	.glass-themed-border {
		border-color: var(--_glass-border);
	}
	:global(.dark) .glass-themed-border {
		border-color: var(--_glass-border-dark);
	}
</style>
