<script lang="ts">
	import type { Component, Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { ThemeGlass } from "@autumnsgrove/prism";
	import { BLUR_CSS } from "@autumnsgrove/prism";
	import { cn } from "$lib/ui/utils";
	import { GossamerClouds } from "@autumnsgrove/gossamer/svelte";
	import { phaseIcons } from "@autumnsgrove/prism/icons";
	import Waystone from "./Waystone.svelte";

	/**
	 * GlassCard - A glassmorphism card component with seasonal theming
	 *
	 * DESIGN PHILOSOPHY: GlassCard is intentionally a custom component, NOT extending shadcn's Card.
	 * It implements a fundamentally different design language:
	 * - Glassmorphism with backdrop blur effects (translucent surfaces over content)
	 * - Seasonal color variants with warm grove tones (not neutral shadows)
	 * - Animated ASCII backgrounds via Gossamer integration
	 * - Featured star indicators for content hierarchy
	 * - Multiple transparency levels (40-95%) for visual layering
	 *
	 * Variant names align with Prism's ThemeGlass interface (7 variants).
	 * The `default` variant is a backward-compatible alias for `card`.
	 * The `dark` variant is GlassCard-specific (inverted text on dark background).
	 *
	 * @example Basic glass card
	 * ```svelte
	 * <GlassCard title="Settings" description="Manage your preferences">
	 *   <p>Card content here</p>
	 * </GlassCard>
	 * ```
	 *
	 * @example Theme-driven glass
	 * ```svelte
	 * <GlassCard variant="frosted" glass={theme.glass} title="Enchanted">
	 *   <p>Glass styled from theme values</p>
	 * </GlassCard>
	 * ```
	 *
	 * @example Card with icon (pass any Lucide component as the icon prop)
	 * ```svelte
	 * <GlassCard title="Settings" icon={Settings} description="Manage your preferences">
	 *   <p>Settings content</p>
	 * </GlassCard>
	 * ```
	 *
	 * @example Card with Waystone help marker
	 * ```svelte
	 * <GlassCard title="Typography" waystone="custom-fonts" waystoneLabel="Learn about fonts">
	 *   <p>Font settings here</p>
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

	/**
	 * GlassCard variant type — aligned with Prism ThemeGlass (7 variants)
	 * plus backward-compat `default` alias and GlassCard-specific `dark`.
	 */
	type GlassCardVariant =
		| "surface" // Headers, prominent panels - highest opacity (95%)
		| "tint" // Text containers, settings sections - medium opacity (60%)
		| "card" // Content cards - high opacity (80%)
		| "frosted" // Strong blur, high opacity (70%) for prominent elements
		| "accent" // Accent-tinted glass for callouts/CTAs (30%)
		| "overlay" // Dark overlay cards for modal-like surfaces (50%)
		| "muted" // Subtle backgrounds - low opacity (40%)
		| "default" // Backward-compatible alias for "card"
		| "dark"; // GlassCard-specific: dark background with inverted text

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

	/** Internal variant key after resolving aliases */
	type ResolvedVariant = Exclude<GlassCardVariant, "default">;

	interface Props extends Omit<HTMLAttributes<HTMLElement>, "class"> {
		variant?: GlassCardVariant;
		title?: string;
		description?: string;
		/** Optional icon component rendered beside the title (Svelte 5 Component or Lucide @lucide/svelte icons) */
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: Component<any>;
		/** Additional CSS classes for the icon (overrides default text-muted-foreground) */
		iconClass?: string;
		hoverable?: boolean;
		border?: boolean;
		class?: string;
		/** HTML element to render (defaults to div, use article/section for semantic content) */
		as?: Element;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
		/**
		 * ThemeGlass configuration from the active theme.
		 * When provided, opacity/blur/border values are derived from the theme
		 * instead of the built-in Tailwind defaults.
		 * Note: `default` resolves to `card`, `dark` falls back to Tailwind classes.
		 */
		glass?: ThemeGlass;
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
		/** Optional Waystone help marker — pass a KB article slug (e.g. "custom-fonts") */
		waystone?: string;
		/** Screen reader label for the waystone (defaults to "Learn more") */
		waystoneLabel?: string;
	}

	// svelte-ignore custom_element_props_identifier
	let {
		variant = "default",
		title,
		description,
		icon,
		iconClass,
		hoverable = false,
		border = true,
		class: className,
		as: element = "div",
		header,
		footer,
		children,
		glass,
		gossamer = false,
		gossamerColor,
		gossamerOpacity,
		gossamerSpeed,
		gossamerStatic = false,
		featured = false,
		featuredColor,
		flush = false,
		waystone,
		waystoneLabel,
		...restProps
	}: Props = $props();

	// Resolve "default" alias to "card"
	const resolved = $derived<ResolvedVariant>(variant === "default" ? "card" : variant);

	// Determine if gossamer is a preset string or custom config
	const isPreset = $derived(typeof gossamer === "string");
	const gossamerPreset = $derived(isPreset ? (gossamer as GossamerPreset) : undefined);
	const gossamerConfig = $derived(!isPreset && gossamer ? (gossamer as GossamerConfig) : undefined);

	// --- Theme-driven glass (when `glass` prop is provided) ---
	// `dark` variant has no ThemeGlass equivalent, falls back to Tailwind classes

	/** Whether this variant can be driven by ThemeGlass */
	const isThemeVariant = $derived(
		glass != null && resolved !== "dark" && resolved in (glass ?? {}),
	);

	/** Compute CSS custom properties from ThemeGlass for the active variant */
	const glassStyle = $derived.by(() => {
		if (!isThemeVariant || !glass) return undefined;
		const key = resolved as keyof ThemeGlass;
		const v = glass[key];
		return [
			`--_glass-bg:${v.background}`,
			`--_glass-bg-dark:${v.backgroundDark}`,
			`--_glass-border:${v.border}`,
			`--_glass-border-dark:${v.borderDark}`,
		].join(";");
	});

	/** Blur style derived from ThemeGlass variant */
	const glassBlurStyle = $derived.by(() => {
		if (!isThemeVariant || !glass) return undefined;
		const key = resolved as keyof ThemeGlass;
		const blurValue = BLUR_CSS[glass[key].blur];
		return blurValue === "none" ? undefined : `backdrop-filter:${blurValue}`;
	});

	/** Combined inline style for theme-driven glass */
	const inlineStyle = $derived.by(() => {
		if (!isThemeVariant) return undefined;
		const parts = [glassStyle, glassBlurStyle].filter(Boolean);
		return parts.length > 0 ? parts.join(";") : undefined;
	});

	// --- Tailwind fallback (when no `glass` prop or for `dark` variant) ---

	// Variant-specific styles - warm grove tones with true glass transparency
	// See Prism spec for opacity guidelines:
	// surface: 95%, tint: 60/50%, card: 80/70%, frosted: 70/35%, accent: 30/20%,
	// overlay: 50/60%, muted: 40/30%
	//
	// Dark mode uses cream tokens for neutral warm grays (cream-100 dark = 37 35 32).
	// WARNING: The grove scale is INVERTED in dark mode — grove-50 = deep green, grove-950 = near-white.
	// Never use grove-* for dark mode glass backgrounds; use cream-* for neutral surfaces.
	const variantClasses: Record<ResolvedVariant, string> = {
		surface: `
			bg-white/95 dark:bg-cream-100/95
			backdrop-blur-md
		`
			.trim()
			.replace(/\s+/g, " "),

		tint: `
			bg-white/60 dark:bg-cream-100/50
			backdrop-blur-md
		`
			.trim()
			.replace(/\s+/g, " "),

		card: `
			bg-white/80 dark:bg-cream-100/65
			backdrop-blur-md
		`
			.trim()
			.replace(/\s+/g, " "),

		frosted: `
			bg-white/90 dark:bg-cream-100/80
			backdrop-blur-lg
		`
			.trim()
			.replace(/\s+/g, " "),

		accent: `
			bg-accent/20 dark:bg-cream-100/25
			backdrop-blur-md
		`
			.trim()
			.replace(/\s+/g, " "),

		overlay: `
			bg-black/50 dark:bg-black/60
			backdrop-blur-lg
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

		dark: `
			bg-bark-900/40 dark:bg-cream-50/50
			backdrop-blur-md
			text-white
		`
			.trim()
			.replace(/\s+/g, " "),
	};

	// Border colors per variant - subtle, warm borders
	// Dark mode: cream-300 = 67 64 58 (medium warm gray), cream-400 = 87 83 76
	const borderClasses: Record<ResolvedVariant, string> = {
		surface: "border-border",
		tint: "border-white/30 dark:border-border",
		card: "border-white/40 dark:border-border",
		frosted: "border-white/50 dark:border-border",
		accent: "border-accent/30 dark:border-border",
		overlay: "border-white/10",
		muted: "border-white/20 dark:border-border",
		dark: "border-bark-700/30 dark:border-border",
	};

	// Hover styles - slightly more visible on hover
	const hoverClasses: Record<ResolvedVariant, string> = {
		surface: "hover:bg-white/100 dark:hover:bg-cream-200/95 hover:shadow-md hover:border-border",
		tint: "hover:bg-white/70 dark:hover:bg-cream-200/55 hover:shadow-md hover:border-white/40 dark:hover:border-cream-400/40",
		card: "hover:bg-white/90 dark:hover:bg-cream-300/50 hover:shadow-lg hover:border-white/50 dark:hover:border-cream-400/50",
		frosted:
			"hover:bg-white/95 dark:hover:bg-cream-300/60 hover:shadow-lg hover:border-white/60 dark:hover:border-cream-400/50",
		accent:
			"hover:bg-accent/30 dark:hover:bg-cream-200/35 hover:shadow-lg hover:shadow-accent/10 hover:border-accent/40",
		overlay: "hover:bg-black/60 dark:hover:bg-black/70 hover:shadow-2xl",
		muted:
			"hover:bg-white/70 dark:hover:bg-cream-300/40 hover:shadow-md hover:border-white/30 dark:hover:border-cream-400/40",
		dark: "hover:bg-bark-900/50 dark:hover:bg-cream-50/60 hover:shadow-xl hover:border-bark-600/40",
	};

	const computedClass = $derived(
		cn(
			"rounded-xl transition-all duration-200",
			// Add relative positioning when gossamer or featured is enabled
			(gossamer || featured) && "relative",
			// Add overflow hidden only for gossamer
			gossamer && "overflow-hidden",
			// When glass prop is provided and variant is theme-driven, use CSS custom properties
			isThemeVariant ? "glass-card-themed" : variantClasses[resolved],
			border && `border ${isThemeVariant ? "glass-card-themed-border" : borderClasses[resolved]}`,
			hoverable && `cursor-pointer ${hoverClasses[resolved]}`,
			"shadow-sm",
			className,
		),
	);

	// Text color adjustments for dark/overlay variants
	const isDarkText = $derived(resolved === "dark" || resolved === "overlay");
	const titleClass = $derived(isDarkText ? "text-white" : "text-foreground");

	const descriptionClass = $derived(isDarkText ? "text-cream-300" : "text-muted-foreground");
</script>

<svelte:element this={element} class={computedClass} style={inlineStyle} {...restProps}>
	{#if featured}
		<!-- Featured star indicator (decorative - context provides meaning) -->
		<div
			class="absolute top-2 right-2 z-grove-raised flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-cream-200 shadow-md border border-warning/30 dark:border-warning-muted/50"
			title="Featured"
			aria-hidden="true"
		>
			<phaseIcons.star
				class="w-3.5 h-3.5 fill-current {featuredColor ? '' : 'text-warning'}"
				style={featuredColor ? `color: ${featuredColor}` : undefined}
			/>
		</div>
	{/if}

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
	<div class={cn(gossamer && "relative z-10", flush && "flex-1 flex flex-col min-h-0")}>
		{#if header || title || description}
			<div class="px-6 py-4 {children || footer ? 'border-b border-inherit' : ''}">
				{#if header}
					{@render header()}
				{:else}
					{#if title}
						<div class="flex items-center gap-2">
							<h3
								class="text-lg font-semibold {titleClass} {icon ? 'flex items-center gap-2' : ''}"
							>
								{#if icon}
									{@const Icon = icon}
									<Icon class="w-5 h-5 shrink-0 {iconClass || 'text-muted-foreground'}" />
								{/if}
								{title}
							</h3>
							{#if waystone}
								<Waystone slug={waystone} label={waystoneLabel} class="shrink-0" />
							{/if}
						</div>
					{/if}
					{#if description}
						<p class="text-sm {descriptionClass} {icon ? 'ml-7' : ''} mt-1">{description}</p>
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

<style>
	/* Theme-driven glass: light mode uses --_glass-bg, dark mode uses --_glass-bg-dark */
	.glass-card-themed {
		background: var(--_glass-bg);
	}
	:global(.dark) .glass-card-themed {
		background: var(--_glass-bg-dark);
	}

	.glass-card-themed-border {
		border-color: var(--_glass-border);
	}
	:global(.dark) .glass-card-themed-border {
		border-color: var(--_glass-border-dark);
	}
</style>
