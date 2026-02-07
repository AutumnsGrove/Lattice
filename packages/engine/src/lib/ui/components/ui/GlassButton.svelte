<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { Button } from "./index.js";
	import { cn } from "$lib/ui/utils";

	/**
	 * GlassButton - A button with glassmorphism styling
	 *
	 * Extends the base Button component with glass effects (backdrop blur,
	 * translucent backgrounds, subtle borders). Inherits all Button functionality
	 * including polymorphic rendering, focus management, and keyboard handling.
	 *
	 * @example Basic glass button
	 * ```svelte
	 * <GlassButton>Click me</GlassButton>
	 * ```
	 *
	 * @example Accent glass button
	 * ```svelte
	 * <GlassButton variant="accent">Subscribe</GlassButton>
	 * ```
	 *
	 * @example Ghost glass with icon
	 * ```svelte
	 * <GlassButton variant="ghost" size="icon">
	 *   <X class="w-4 h-4" />
	 * </GlassButton>
	 * ```
	 */

	type GlassVariant =
		| "default" // Light translucent background
		| "accent" // Accent-colored glass
		| "dark" // Dark translucent background
		| "ghost" // No background until hover
		| "outline"; // Transparent with glass border

	type ButtonSize = "sm" | "md" | "lg" | "icon";

	interface Props extends Omit<HTMLButtonAttributes, "class"> {
		variant?: GlassVariant;
		size?: ButtonSize;
		disabled?: boolean;
		href?: string;
		class?: string;
		children?: Snippet;
		ref?: HTMLButtonElement | null;
	}

	let {
		variant = "default",
		size = "md",
		disabled = false,
		href,
		class: className,
		children,
		ref = $bindable(null),
		...restProps
	}: Props = $props();

	// Map glass variants to base Button variants
	const buttonVariantMap: Record<GlassVariant, "primary" | "secondary" | "ghost" | "outline"> = {
		default: "primary",
		accent: "primary",
		dark: "secondary",
		ghost: "ghost",
		outline: "outline"
	};

	// Glass base classes - the glassmorphism foundation
	const glassBase = "backdrop-blur-md";

	// Glass variant-specific overlays - these ADD to Button's styling
	const glassOverlays: Record<GlassVariant, string> = {
		default: `
			bg-white/80 dark:bg-grove-950/25
			border border-white/40 dark:border-grove-800/25
			text-foreground
			hover:bg-white/90 dark:hover:bg-grove-950/35
			hover:border-white/50 dark:hover:border-grove-700/30
			shadow-sm hover:shadow-md
		`
			.trim()
			.replace(/\s+/g, " "),

		accent: `
			bg-accent/70 dark:bg-accent/60
			border border-accent/40 dark:border-accent/30
			text-accent-foreground dark:text-white
			hover:bg-accent/85 dark:hover:bg-accent/75
			hover:border-accent/60 dark:hover:border-accent/50
			shadow-sm hover:shadow-md shadow-accent/20
		`
			.trim()
			.replace(/\s+/g, " "),

		dark: `
			bg-bark-900/50 dark:bg-bark-950/50
			border border-bark-700/30 dark:border-bark-600/30
			text-white
			hover:bg-bark-900/65 dark:hover:bg-bark-950/65
			hover:border-bark-600/40 dark:hover:border-bark-500/35
			shadow-md hover:shadow-lg
		`
			.trim()
			.replace(/\s+/g, " "),

		ghost: `
			bg-transparent
			border border-transparent
			text-foreground
			hover:bg-white/60 dark:hover:bg-grove-950/25
			hover:border-white/25 dark:hover:border-grove-800/20
		`
			.trim()
			.replace(/\s+/g, " "),

		outline: `
			bg-transparent
			border border-white/40 dark:border-grove-800/30
			text-foreground
			hover:bg-white/50 dark:hover:bg-grove-950/20
			hover:border-white/55 dark:hover:border-grove-700/40
		`
			.trim()
			.replace(/\s+/g, " ")
	};

	const glassClasses = $derived(cn(glassBase, glassOverlays[variant], className));
</script>

<Button
	bind:ref
	variant={buttonVariantMap[variant]}
	{size}
	{disabled}
	{href}
	class={glassClasses}
	{...restProps}
>
	{#if children}{@render children()}{/if}
</Button>
