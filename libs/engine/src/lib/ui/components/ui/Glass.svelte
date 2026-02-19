<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";
	// TODO: Re-enable when gossamer package exports are wired up
	// import { GossamerClouds } from "@autumnsgrove/gossamer/svelte";
	// import "@autumnsgrove/gossamer/svelte/style.css";

	/**
	 * Glass component for creating glassmorphism effects
	 *
	 * A reusable component that provides translucent, frosted-glass effects
	 * perfect for overlays, cards, navbars, and text containers while
	 * maintaining visibility of background elements.
	 *
	 * Now with optional Gossamer ASCII cloud backgrounds!
	 *
	 * @example Basic usage
	 * ```svelte
	 * <Glass variant="card">
	 *   <p>Content with glass background</p>
	 * </Glass>
	 * ```
	 *
	 * @example With Gossamer background
	 * ```svelte
	 * <Glass variant="card" gossamer="grove-mist">
	 *   <p>Content with animated ASCII clouds beneath the glass</p>
	 * </Glass>
	 * ```
	 *
	 * @example Custom Gossamer settings
	 * ```svelte
	 * <Glass variant="card" gossamer="grove-fireflies" gossamerColor="#34d399" gossamerOpacity={0.4}>
	 *   <p>Customized ASCII effect</p>
	 * </Glass>
	 * ```
	 */

	type Variant =
		| "surface" // Headers, navbars - high opacity, subtle blur
		| "overlay" // Modal backdrops - dark, medium blur
		| "card" // Content cards - medium opacity, clean look
		| "tint" // Text containers - light background for readability
		| "accent" // Accent-colored glass for callouts/highlights
		| "muted"; // Subtle background, barely visible

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
		| "autumn-leaves"
		| "spring-petals"
		| "summer-heat"
		| "ambient-static"
		| "ambient-waves"
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
		/** Visual style variant */
		variant?: Variant;
		/** Blur intensity */
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

	// Background colors per variant - warm grove tones, translucent for glass effect
	const variantClasses: Record<Variant, string> = {
		// High opacity for sticky headers/navbars (uses background color)
		surface: "bg-background/90 dark:bg-background/90",

		// Dark overlay for modals/sheets
		overlay: "bg-black/50 dark:bg-black/60",

		// Medium opacity for content cards - translucent with grove warmth
		card: "bg-white/80 dark:bg-grove-950/25",

		// Light tint for text readability
		tint: "bg-white/70 dark:bg-grove-950/20",

		// Accent-colored glass for highlights/callouts
		accent: "bg-accent/25 dark:bg-accent/15",

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
	const borderClasses: Record<Variant, string> = {
		surface: "border-border",
		overlay: "border-white/10",
		card: "border-white/40 dark:border-grove-800/25",
		tint: "border-white/30 dark:border-grove-800/20",
		accent: "border-accent/30 dark:border-accent/20",
		muted: "border-white/20 dark:border-grove-800/15",
	};

	// Shadow classes
	const shadowClasses: Record<Variant, string> = {
		surface: "shadow-sm",
		overlay: "shadow-2xl",
		card: "shadow-sm",
		tint: "shadow-sm",
		accent: "shadow-sm",
		muted: "",
	};

	const computedClass = $derived(
		cn(
			// Add relative positioning and overflow hidden when gossamer is enabled
			gossamer && "relative overflow-hidden",
			variantClasses[variant],
			intensityClasses[intensity],
			border && `border ${borderClasses[variant]}`,
			shadow && shadowClasses[variant],
			className,
		),
	);
</script>

<!--
  Glassmorphism component for Grove

  CSS Properties used:
  - backdrop-filter: blur() - Creates the frosted glass effect
  - Background with alpha - Semi-transparent backgrounds (e.g., bg-white/80)
  - Border with alpha - Subtle borders that complement the glass effect

  Gossamer Integration:
  - When `gossamer` prop is set, renders ASCII cloud patterns behind the glass
  - The backdrop-blur creates a beautiful frosted effect over the ASCII
  - Patterns are accessible via preset names or custom configuration

  Browser Support:
  - backdrop-filter is supported in all modern browsers
  - Falls back gracefully to solid backgrounds in older browsers
-->

<svelte:element this={element} class={computedClass} {...restProps}>
	<!-- TODO: Re-enable GossamerClouds when gossamer package exports are wired up -->
	<!-- {#if gossamer} ... {/if} -->

	<!-- Content layer (above Gossamer) -->
	{#if children}
		<div class="relative z-10">
			{@render children()}
		</div>
	{/if}
</svelte:element>
