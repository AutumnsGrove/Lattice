<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";
	// TODO: Re-enable when gossamer package exports are wired up
	// import { GossamerClouds } from "@autumnsgrove/gossamer/svelte";
	// import "@autumnsgrove/gossamer/svelte/style.css";
	import { Star } from "@lucide/svelte";

	/**
	 * GlassCard - A glassmorphism card component with seasonal theming
	 *
	 * DESIGN PHILOSOPHY: GlassCard is intentionally a custom component, NOT extending shadcn's Card.
	 * It implements a fundamentally different design language:
	 * - Glassmorphism with backdrop blur effects (translucent surfaces over content)
	 * - Seasonal color variants with warm grove tones (not neutral shadows)
	 * - Animated ASCII backgrounds via Gossamer integration
	 * - Featured star indicators for content hierarchy
	 * - Multiple transparency levels (40-80%) for visual layering
	 *
	 * This is not "Card with glass styling"—it's a completely different visual paradigm.
	 * Extending shadcn's Card would require overriding all its styling anyway, so we built
	 * GlassCard from scratch to stay true to Grove's aesthetic: cozy, organic, alive.
	 *
	 * Features:
	 * - Beautiful translucent cards with backdrop blur effects
	 * - Optional header, footer, and hoverable states
	 * - Gossamer ASCII background animations (grove-mist, seasonal presets, custom configs)
	 * - Semantic HTML elements (div, section, article, aside, etc.) for Reader Mode
	 * - Dark mode with warm, nature-inspired palette
	 *
	 * @example Basic glass card
	 * ```svelte
	 * <GlassCard title="Settings" description="Manage your preferences">
	 *   <p>Card content here</p>
	 * </GlassCard>
	 * ```
	 *
	 * @example With Gossamer ASCII background
	 * ```svelte
	 * <GlassCard title="Enchanted" gossamer="grove-mist" gossamerColor="#34d399">
	 *   <p>Content with animated ASCII clouds</p>
	 * </GlassCard>
	 * ```
	 *
	 * @example Featured card with star indicator
	 * ```svelte
	 * <GlassCard title="Important" featured>
	 *   <p>This card has a star to mark it as featured</p>
	 * </GlassCard>
	 * ```
	 *
	 * @example Accent card with footer
	 * ```svelte
	 * <GlassCard variant="accent" hoverable>
	 *   {#snippet header()}<CustomHeader />{/snippet}
	 *   Content here
	 *   {#snippet footer()}<Button>Save</Button>{/snippet}
	 * </GlassCard>
	 * ```
	 *
	 * @example Semantic article for blog posts (improves Safari Reader Mode)
	 * ```svelte
	 * <GlassCard as="article" title="My Blog Post">
	 *   <p>Post content here</p>
	 * </GlassCard>
	 * ```
	 */

	type GlassVariant =
		| "default" // Light translucent background
		| "accent" // Accent-colored glass
		| "dark" // Dark translucent background
		| "muted" // Very subtle, barely visible
		| "frosted"; // Stronger blur effect, more opaque

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

	/** Semantic HTML elements for improved accessibility and Reader Mode */
	type Element = "div" | "section" | "article" | "aside" | "header" | "footer" | "nav" | "main";

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

	interface Props extends Omit<HTMLAttributes<HTMLElement>, "class"> {
		variant?: GlassVariant;
		title?: string;
		description?: string;
		hoverable?: boolean;
		border?: boolean;
		class?: string;
		/** HTML element to render (defaults to div, use article/section for semantic content) */
		as?: Element;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
		/** Gossamer ASCII background - preset name or custom config */
		gossamer?: GossamerPreset | GossamerConfig | false;
		/** Override Gossamer color */
		gossamerColor?: string;
		/** Override Gossamer opacity (0-1) */
		gossamerOpacity?: number;
		/** Override Gossamer animation speed */
		gossamerSpeed?: number;
		/** Disable animation (show static pattern) */
		gossamerStatic?: boolean;
		/** Show a star indicator to mark this card as featured/important */
		featured?: boolean;
		/** Custom color for the featured star (defaults to amber) */
		featuredColor?: string;
		/** Render children without padding wrapper, propagating flex layout.
		 *  Use when the card needs flex-col overflow control (e.g. scroll + sticky footer). */
		flush?: boolean;
	}

	// svelte-ignore custom_element_props_identifier
	let {
		variant = "default",
		title,
		description,
		hoverable = false,
		border = true,
		class: className,
		as: element = "div",
		header,
		footer,
		children,
		gossamer = false,
		gossamerColor,
		gossamerOpacity,
		gossamerSpeed,
		gossamerStatic = false,
		featured = false,
		featuredColor,
		flush = false,
		...restProps
	}: Props = $props();

	// Determine if gossamer is a preset string or custom config
	const isPreset = $derived(typeof gossamer === "string");
	const gossamerPreset = $derived(isPreset ? (gossamer as GossamerPreset) : undefined);
	const gossamerConfig = $derived(!isPreset && gossamer ? (gossamer as GossamerConfig) : undefined);

	// Variant-specific styles - warm grove tones with true glass transparency
	// See grove-ui-design skill for opacity guidelines:
	// surface: 95%, tint: 60/50%, card: 80/70%, muted: 40/30%, overlay: 50/60%
	//
	// Dark mode uses cream tokens for neutral warm grays (cream-100 dark = 37 35 32).
	// WARNING: The grove scale is INVERTED in dark mode — grove-50 = deep green, grove-950 = near-white.
	// Never use grove-* for dark mode glass backgrounds; use cream-* for neutral surfaces.
	const variantClasses: Record<GlassVariant, string> = {
		default: `
			bg-white/80 dark:bg-cream-100/65
			backdrop-blur-md
		`
			.trim()
			.replace(/\s+/g, " "),

		accent: `
			bg-accent/20 dark:bg-cream-100/25
			backdrop-blur-md
		`
			.trim()
			.replace(/\s+/g, " "),

		dark: `
			bg-bark-900/40 dark:bg-cream-50/50
			backdrop-blur-md
			text-white
		`
			.trim()
			.replace(/\s+/g, " "),

		muted: `
			bg-white/60 dark:bg-cream-100/40
			backdrop-blur
		`
			.trim()
			.replace(/\s+/g, " "),

		frosted: `
			bg-white/90 dark:bg-cream-100/80
			backdrop-blur-lg
		`
			.trim()
			.replace(/\s+/g, " "),
	};

	// Border colors per variant - subtle, warm borders
	// Dark mode: cream-300 = 67 64 58 (medium warm gray), cream-400 = 87 83 76
	const borderClasses: Record<GlassVariant, string> = {
		default: "border-white/40 dark:border-cream-300/40",
		accent: "border-accent/30 dark:border-cream-300/30",
		dark: "border-bark-700/30 dark:border-cream-400/30",
		muted: "border-white/20 dark:border-cream-300/30",
		frosted: "border-white/50 dark:border-cream-300/40",
	};

	// Hover styles - slightly more visible on hover
	const hoverClasses: Record<GlassVariant, string> = {
		default:
			"hover:bg-white/90 dark:hover:bg-cream-300/50 hover:shadow-lg hover:border-white/50 dark:hover:border-cream-400/50",
		accent:
			"hover:bg-accent/30 dark:hover:bg-cream-200/35 hover:shadow-lg hover:shadow-accent/10 hover:border-accent/40",
		dark: "hover:bg-bark-900/50 dark:hover:bg-cream-50/60 hover:shadow-xl hover:border-bark-600/40",
		muted:
			"hover:bg-white/70 dark:hover:bg-cream-300/40 hover:shadow-md hover:border-white/30 dark:hover:border-cream-400/40",
		frosted:
			"hover:bg-white/95 dark:hover:bg-cream-300/60 hover:shadow-lg hover:border-white/60 dark:hover:border-cream-400/50",
	};

	const computedClass = $derived(
		cn(
			"rounded-xl transition-all duration-200",
			// Add relative positioning when gossamer or featured is enabled
			(gossamer || featured) && "relative",
			// Add overflow hidden only for gossamer
			gossamer && "overflow-hidden",
			variantClasses[variant],
			border && `border ${borderClasses[variant]}`,
			hoverable && `cursor-pointer ${hoverClasses[variant]}`,
			"shadow-sm",
			className,
		),
	);

	// Text color adjustments for dark variant
	const titleClass = $derived(variant === "dark" ? "text-white" : "text-foreground");

	const descriptionClass = $derived(
		variant === "dark" ? "text-cream-300" : "text-muted-foreground",
	);
</script>

<svelte:element this={element} class={computedClass} {...restProps}>
	{#if featured}
		<!-- Featured star indicator (decorative - context provides meaning) -->
		<div
			class="absolute top-2 right-2 z-grove-raised flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-cream-200 shadow-md border border-amber-200 dark:border-amber-700"
			title="Featured"
			aria-hidden="true"
		>
			<Star
				class="w-3.5 h-3.5 fill-current {featuredColor ? '' : 'text-amber-500'}"
				style={featuredColor ? `color: ${featuredColor}` : undefined}
			/>
		</div>
	{/if}

	<!-- TODO: Re-enable GossamerClouds when gossamer package exports are wired up -->
	<!-- {#if gossamer} ... {/if} -->

	<!-- Content layer (above Gossamer) -->
	<div class={cn(gossamer && "relative z-10", flush && "flex-1 flex flex-col min-h-0")}>
		{#if header || title || description}
			<div class="px-6 py-4 {children || footer ? 'border-b border-inherit' : ''}">
				{#if header}
					{@render header()}
				{:else}
					{#if title}
						<h3 class="text-lg font-semibold {titleClass}">{title}</h3>
					{/if}
					{#if description}
						<p class="text-sm {descriptionClass} mt-1">{description}</p>
					{/if}
				{/if}
			</div>
		{/if}

		{#if children}
			{#if flush}
				{@render children()}
			{:else}
				<div class="px-6 py-4">
					{@render children()}
				</div>
			{/if}
		{/if}

		{#if footer}
			<div class="px-6 py-4 border-t border-inherit">
				{@render footer()}
			</div>
		{/if}
	</div>
</svelte:element>
